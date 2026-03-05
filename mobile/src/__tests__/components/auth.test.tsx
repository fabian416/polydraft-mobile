import './setup';
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { WalletButton } from '../../components/auth/WalletButton';
import { WalletGate } from '../../components/auth/WalletGate';
import { useWallet } from '../../providers/WalletProvider';
import { Text } from 'react-native';

const mockUseWallet = useWallet as jest.MockedFunction<typeof useWallet>;

// ─── WalletButton ────────────────────────────────────────────

describe('WalletButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders "Connect Wallet" when disconnected', () => {
    mockUseWallet.mockReturnValue({
      publicKey: null,
      connected: false,
      connecting: false,
      connect: jest.fn(),
      disconnect: jest.fn(),
      signTransaction: jest.fn(),
      signMessage: jest.fn(),
    });

    const { getByText } = render(<WalletButton />);
    expect(getByText('Connect Wallet')).toBeTruthy();
  });

  it('renders "Connecting..." when connecting', () => {
    mockUseWallet.mockReturnValue({
      publicKey: null,
      connected: false,
      connecting: true,
      connect: jest.fn(),
      disconnect: jest.fn(),
      signTransaction: jest.fn(),
      signMessage: jest.fn(),
    });

    const { getByText } = render(<WalletButton />);
    expect(getByText('Connecting...')).toBeTruthy();
  });

  it('renders truncated address when connected', () => {
    const mockPublicKey = {
      toBase58: () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmn',
    };

    mockUseWallet.mockReturnValue({
      publicKey: mockPublicKey as any,
      connected: true,
      connecting: false,
      connect: jest.fn(),
      disconnect: jest.fn(),
      signTransaction: jest.fn(),
      signMessage: jest.fn(),
    });

    const { getByText } = render(<WalletButton />);
    expect(getByText('ABCD...klmn')).toBeTruthy();
  });

  it('calls connect when disconnected button is pressed', () => {
    const connect = jest.fn();
    mockUseWallet.mockReturnValue({
      publicKey: null,
      connected: false,
      connecting: false,
      connect,
      disconnect: jest.fn(),
      signTransaction: jest.fn(),
      signMessage: jest.fn(),
    });

    const { getByText } = render(<WalletButton />);
    fireEvent.press(getByText('Connect Wallet'));
    expect(connect).toHaveBeenCalled();
  });

  it('calls disconnect when connected button is pressed', () => {
    const disconnect = jest.fn();
    const mockPublicKey = {
      toBase58: () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmn',
    };

    mockUseWallet.mockReturnValue({
      publicKey: mockPublicKey as any,
      connected: true,
      connecting: false,
      connect: jest.fn(),
      disconnect,
      signTransaction: jest.fn(),
      signMessage: jest.fn(),
    });

    const { getByText } = render(<WalletButton />);
    fireEvent.press(getByText('ABCD...klmn'));
    expect(disconnect).toHaveBeenCalled();
  });
});

// ─── WalletGate ──────────────────────────────────────────────

describe('WalletGate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders connect UI when not connected', () => {
    mockUseWallet.mockReturnValue({
      publicKey: null,
      connected: false,
      connecting: false,
      connect: jest.fn(),
      disconnect: jest.fn(),
      signTransaction: jest.fn(),
      signMessage: jest.fn(),
    });

    const { getByText } = render(
      <WalletGate>
        <Text>Protected Content</Text>
      </WalletGate>
    );
    expect(getByText('Connect your wallet to play')).toBeTruthy();
  });

  it('renders Polydraft title', () => {
    mockUseWallet.mockReturnValue({
      publicKey: null,
      connected: false,
      connecting: false,
      connect: jest.fn(),
      disconnect: jest.fn(),
      signTransaction: jest.fn(),
      signMessage: jest.fn(),
    });

    const { getByText } = render(
      <WalletGate>
        <Text>Content</Text>
      </WalletGate>
    );
    expect(getByText('Polydraft')).toBeTruthy();
  });
});
