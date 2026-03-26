import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Horizon,
  Keypair,
  Networks,
  TransactionBuilder,
  BASE_FEE,
  Operation,
  SorobanRpc,
  nativeToScVal,
  Address,
} from '@stellar/stellar-sdk';

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

@Injectable()
export class StellarService {
  private readonly logger = new Logger(StellarService.name);
  private server: Horizon.Server;
  private sorobanServer: SorobanRpc.Server;
  private networkPassphrase: string;
  private analyticsContractId: string;
  private tokenContractId: string;

  constructor(private configService: ConfigService) {
    const isTestnet = this.configService.get('STELLAR_NETWORK') !== 'mainnet';
    this.networkPassphrase = isTestnet ? Networks.TESTNET : Networks.PUBLIC;

    this.server = new Horizon.Server(
      isTestnet
        ? 'https://horizon-testnet.stellar.org'
        : 'https://horizon.stellar.org',
    );

    const rpcUrl =
      this.configService.get('SOROBAN_RPC_URL') ||
      'https://soroban-testnet.stellar.org';
    this.sorobanServer = new SorobanRpc.Server(rpcUrl);

    this.analyticsContractId =
      this.configService.get('ANALYTICS_CONTRACT_ID') || '';
    this.tokenContractId =
      this.configService.get('TOKEN_CONTRACT_ID') || '';
  }

  // ── Public API ────────────────────────────────────────────────────────────

  async getAccountBalance(publicKey: string) {
    const account = await this.server.loadAccount(publicKey);
    return account.balances;
  }

  /** Record progress on the Analytics Soroban contract */
  async recordProgress(
    studentPublicKey: string,
    courseId: string,
    progressPct: number,
  ): Promise<string> {
    if (!this.analyticsContractId) {
      throw new Error('ANALYTICS_CONTRACT_ID not configured');
    }
    return this.retryWithBackoff(() =>
      this.invokeContract(this.analyticsContractId, 'record_progress', [
        new Address(studentPublicKey).toScVal(),
        nativeToScVal(courseId, { type: 'symbol' }),
        nativeToScVal(progressPct, { type: 'u32' }),
      ]),
    );
  }

  /** Issue a credential via Horizon manageData (with Soroban record_progress fallback) */
  async issueCredential(
    recipientPublicKey: string,
    courseId: string,
  ): Promise<string> {
    try {
      await this.recordProgress(recipientPublicKey, courseId, 100);
    } catch (err) {
      this.logger.warn(`Soroban record_progress failed, continuing: ${err.message}`);
    }
    return this.mintCredentialViaHorizon(recipientPublicKey, courseId);
  }

  /** Mint reward tokens via the Token Soroban contract */
  async mintReward(
    recipientPublicKey: string,
    amount: number,
  ): Promise<string> {
    if (!this.tokenContractId) {
      throw new Error('TOKEN_CONTRACT_ID not configured');
    }
    return this.retryWithBackoff(() =>
      this.invokeContract(this.tokenContractId, 'mint_reward', [
        new Address(recipientPublicKey).toScVal(),
        nativeToScVal(amount, { type: 'i128' }),
      ]),
    );
  }

  /** Verify a credential by looking up the tx hash on Horizon */
  async verifyCredential(txHash: string): Promise<{ verified: boolean; details: any }> {
    try {
      const tx = await this.server.transactions().transaction(txHash).call();
      return { verified: true, details: tx };
    } catch {
      return { verified: false, details: null };
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async invokeContract(
    contractId: string,
    method: string,
    args: any[],
  ): Promise<string> {
    const issuerKeypair = Keypair.fromSecret(
      this.configService.get('STELLAR_SECRET_KEY')!,
    );
    const source = await this.sorobanServer.getAccount(issuerKeypair.publicKey());

    const tx = new TransactionBuilder(source as any, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(
        Operation.invokeContractFunction({
          contract: contractId,
          function: method,
          args,
        }),
      )
      .setTimeout(30)
      .build();

    const prepared = await this.sorobanServer.prepareTransaction(tx);
    (prepared as any).sign(issuerKeypair);
    const result = await this.sorobanServer.sendTransaction(prepared as any);
    this.logger.log(`Contract ${method} tx: ${result.hash}`);
    return result.hash;
  }

  private async mintCredentialViaHorizon(
    recipientPublicKey: string,
    courseId: string,
  ): Promise<string> {
    const issuerKeypair = Keypair.fromSecret(
      this.configService.get('STELLAR_SECRET_KEY')!,
    );
    const issuerAccount = await this.server.loadAccount(issuerKeypair.publicKey());

    const tx = new TransactionBuilder(issuerAccount, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(
        Operation.manageData({
          name: `brain-storm:credential:${courseId}`,
          value: recipientPublicKey,
        }),
      )
      .setTimeout(30)
      .build();

    tx.sign(issuerKeypair);
    const result = await this.server.submitTransaction(tx);
    this.logger.log(`Credential issued via Horizon: ${result.hash}`);
    return result.hash;
  }

  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    attempt = 1,
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= MAX_RETRIES) throw error;
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      this.logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
      return this.retryWithBackoff(fn, attempt + 1);
    }
  }
}
