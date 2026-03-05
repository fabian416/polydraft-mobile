/**
 * Solana Mobile Wallet Provider (React Native)
 *
 * Wraps the app with wallet context using @solana-mobile/mobile-wallet-adapter-protocol-web3js.
 * Provides: publicKey, connected, connect(), disconnect(), signTransaction(), signMessage()
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { PublicKey, VersionedTransaction } from '@solana/web3.js';
import {
  transact,
  Web3MobileWallet,
} from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';

// ============================================
// Types
// ============================================

interface WalletContextState {
  publicKey: PublicKey | null;
  connected: boolean;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  signTransaction: (
    transaction: VersionedTransaction
  ) => Promise<VersionedTransaction>;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
}

const WalletContext = createContext<WalletContextState>({
  publicKey: null,
  connected: false,
  connecting: false,
  connect: async () => {},
  disconnect: () => {},
  signTransaction: async () => {
    throw new Error('Wallet not connected');
  },
  signMessage: async () => {
    throw new Error('Wallet not connected');
  },
});

// ============================================
// Stored auth token for session reuse
// ============================================

let storedAuthToken: string | null = null;

const APP_IDENTITY = {
  name: 'Polydraft',
  uri: 'https://polydraft.app',
  icon: 'favicon.ico',
};

// ============================================
// Provider
// ============================================

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [connecting, setConnecting] = useState(false);

  const connected = publicKey !== null;

  const connect = useCallback(async () => {
    if (connecting) return;
    setConnecting(true);

    try {
      await transact(async (wallet: Web3MobileWallet) => {
        const authResult = await wallet.authorize({
          cluster: 'devnet',
          identity: APP_IDENTITY,
        });

        storedAuthToken = authResult.auth_token;
        const pubkey = new PublicKey(authResult.accounts[0].address);
        setPublicKey(pubkey);
      });
    } finally {
      setConnecting(false);
    }
  }, [connecting]);

  const disconnect = useCallback(() => {
    storedAuthToken = null;
    setPublicKey(null);
  }, []);

  const authorizeSession = async (wallet: Web3MobileWallet) => {
    if (storedAuthToken) {
      try {
        const reauth = await wallet.reauthorize({
          auth_token: storedAuthToken,
          identity: APP_IDENTITY,
        });
        storedAuthToken = reauth.auth_token;
        return;
      } catch {
        // Token expired, fall through to fresh authorize
      }
    }
    const authResult = await wallet.authorize({
      cluster: 'devnet',
      identity: APP_IDENTITY,
    });
    storedAuthToken = authResult.auth_token;
  };

  const signTransaction = useCallback(
    async (transaction: VersionedTransaction): Promise<VersionedTransaction> => {
      if (!publicKey) throw new Error('Wallet not connected');

      let signed: VersionedTransaction | undefined;

      await transact(async (wallet: Web3MobileWallet) => {
        await authorizeSession(wallet);

        const signedTxs = await wallet.signTransactions({
          transactions: [transaction],
        });
        signed = signedTxs[0] as VersionedTransaction;
      });

      if (!signed) throw new Error('Transaction signing failed');
      return signed;
    },
    [publicKey]
  );

  const signMessage = useCallback(
    async (message: Uint8Array): Promise<Uint8Array> => {
      if (!publicKey) throw new Error('Wallet not connected');

      let signature: Uint8Array | undefined;

      await transact(async (wallet: Web3MobileWallet) => {
        await authorizeSession(wallet);

        const signedMessages = await wallet.signMessages({
          addresses: [publicKey.toBase58()],
          payloads: [message],
        });
        signature = signedMessages[0];
      });

      if (!signature) throw new Error('Message signing failed');
      return signature;
    },
    [publicKey]
  );

  const value = useMemo<WalletContextState>(
    () => ({
      publicKey,
      connected,
      connecting,
      connect,
      disconnect,
      signTransaction,
      signMessage,
    }),
    [publicKey, connected, connecting, connect, disconnect, signTransaction, signMessage]
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

// ============================================
// Hook
// ============================================

export function useWallet(): WalletContextState {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return ctx;
}
