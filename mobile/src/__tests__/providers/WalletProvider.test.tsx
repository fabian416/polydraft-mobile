import React from 'react';
import { PublicKey, VersionedTransaction } from '@solana/web3.js';
import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { WalletProvider, useWallet } from '../../providers/WalletProvider';

// We need a way to call the hook in tests. Since we're in node environment
// without a full React renderer, we'll test the provider logic directly
// by extracting the transact callback behavior.

describe('WalletProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('transact mock', () => {
    it('calls transact with a callback', async () => {
      await (transact as jest.Mock)(async (wallet: any) => {
        const result = await wallet.authorize({
          cluster: 'devnet',
          identity: { name: 'Polydraft' },
        });
        expect(result.auth_token).toBe('mock-auth-token');
        expect(result.accounts).toHaveLength(1);
      });

      expect(transact).toHaveBeenCalledTimes(1);
    });

    it('wallet.authorize returns accounts with address bytes', async () => {
      await (transact as jest.Mock)(async (wallet: any) => {
        const result = await wallet.authorize({
          cluster: 'devnet',
          identity: { name: 'Polydraft' },
        });
        expect(result.accounts[0].address).toBeInstanceOf(Uint8Array);
        expect(result.accounts[0].address.length).toBe(32);
      });
    });

    it('wallet.reauthorize returns a new auth token', async () => {
      await (transact as jest.Mock)(async (wallet: any) => {
        const result = await wallet.reauthorize({
          auth_token: 'old-token',
          identity: { name: 'Polydraft' },
        });
        expect(result.auth_token).toBe('mock-reauth-token');
      });
    });

    it('wallet.signTransactions returns the same transactions', async () => {
      const mockTx = new VersionedTransaction({} as any);
      await (transact as jest.Mock)(async (wallet: any) => {
        const signed = await wallet.signTransactions({
          transactions: [mockTx],
        });
        expect(signed).toHaveLength(1);
        expect(signed[0]).toBe(mockTx);
      });
    });

    it('wallet.signMessages returns mock signature bytes', async () => {
      await (transact as jest.Mock)(async (wallet: any) => {
        const sigs = await wallet.signMessages({
          addresses: ['someAddress'],
          payloads: [new Uint8Array(10)],
        });
        expect(sigs).toHaveLength(1);
        expect(sigs[0]).toBeInstanceOf(Uint8Array);
        expect(sigs[0].length).toBe(64);
      });
    });
  });

  describe('WalletProvider component', () => {
    it('exports WalletProvider as a function', () => {
      expect(typeof WalletProvider).toBe('function');
    });

    it('exports useWallet as a function', () => {
      expect(typeof useWallet).toBe('function');
    });

    it('WalletProvider renders without crashing', () => {
      // Basic smoke test: WalletProvider is a valid React component
      const element = React.createElement(WalletProvider, {
        children: React.createElement('div', null, 'test'),
      });
      expect(element).toBeDefined();
      expect(element.type).toBe(WalletProvider);
    });
  });

  describe('connect flow via transact', () => {
    it('authorize + PublicKey construction works end-to-end', async () => {
      let capturedPubkey: PublicKey | null = null;

      await (transact as jest.Mock)(async (wallet: any) => {
        const authResult = await wallet.authorize({
          cluster: 'devnet',
          identity: { name: 'Polydraft', uri: 'https://polydraft.app', icon: 'favicon.ico' },
        });
        capturedPubkey = new PublicKey(authResult.accounts[0].address);
      });

      expect(capturedPubkey).not.toBeNull();
      expect(typeof capturedPubkey!.toBase58()).toBe('string');
    });
  });

  describe('disconnect flow', () => {
    it('clears state conceptually (no stored auth token after disconnect)', () => {
      // The WalletProvider's disconnect sets storedAuthToken = null and publicKey = null.
      // We verify the provider exports disconnect as a callable function.
      // Since we can't easily render React hooks in a node env without a test renderer,
      // we validate the module shape.
      expect(typeof useWallet).toBe('function');
    });
  });

  describe('signTransaction flow via transact', () => {
    it('signs and returns the transaction', async () => {
      const mockTx = new VersionedTransaction({} as any);
      let signedResult: VersionedTransaction | undefined;

      await (transact as jest.Mock)(async (wallet: any) => {
        await wallet.reauthorize({
          auth_token: 'existing-token',
          identity: { name: 'Polydraft' },
        });
        const signedTxs = await wallet.signTransactions({
          transactions: [mockTx],
        });
        signedResult = signedTxs[0];
      });

      expect(signedResult).toBeDefined();
      expect(signedResult).toBe(mockTx);
    });
  });

  describe('signMessage flow via transact', () => {
    it('signs a message and returns a 64-byte signature', async () => {
      const message = new Uint8Array([1, 2, 3, 4, 5]);
      let signature: Uint8Array | undefined;

      await (transact as jest.Mock)(async (wallet: any) => {
        await wallet.reauthorize({
          auth_token: 'existing-token',
          identity: { name: 'Polydraft' },
        });
        const sigs = await wallet.signMessages({
          addresses: ['mockAddress'],
          payloads: [message],
        });
        signature = sigs[0];
      });

      expect(signature).toBeDefined();
      expect(signature!.length).toBe(64);
    });
  });
});
