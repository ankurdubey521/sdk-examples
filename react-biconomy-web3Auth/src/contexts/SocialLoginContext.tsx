import React, { useCallback, useContext, useEffect, useState } from "react";
import { ethers } from "ethers";
import SocialLogin, { getSocialLoginSDK } from "@biconomy/web3-auth";
import { activeChainId } from "../utils/chainConfig";

interface web3AuthContextType {
  connect: () => Promise<SocialLogin | null | undefined>;
  disconnect: () => Promise<void>;
  provider: any;
  ethersProvider: ethers.providers.Web3Provider | null;
  web3Provider: ethers.providers.Web3Provider | null;
  loading: boolean;
  chainId: number;
  address: string;
}
export const Web3AuthContext = React.createContext<web3AuthContextType>({
  connect: () => Promise.resolve(null),
  disconnect: () => Promise.resolve(),
  loading: false,
  provider: null,
  ethersProvider: null,
  web3Provider: null,
  chainId: activeChainId,
  address: "",
});
export const useWeb3AuthContext = () => useContext(Web3AuthContext);

export enum SignTypeMethod {
  PERSONAL_SIGN = "PERSONAL_SIGN",
  EIP712_SIGN = "EIP712_SIGN",
}

type StateType = {
  provider?: any;
  web3Provider?: ethers.providers.Web3Provider | null;
  ethersProvider?: ethers.providers.Web3Provider | null;
  address?: string;
  chainId?: number;
};
const initialState: StateType = {
  provider: null,
  web3Provider: null,
  ethersProvider: null,
  address: "",
  chainId: activeChainId,
};

export const Web3AuthProvider = ({ children }: any) => {
  const [web3State, setWeb3State] = useState<StateType>(initialState);
  const { provider, web3Provider, ethersProvider, address, chainId } =
    web3State;
  const [loading, setLoading] = useState(false);
  const [socialLoginSDK, setSocialLoginSDK] = useState<SocialLogin | null>(
    null
  );

  // if wallet already connected close widget
  useEffect(() => {
    console.log("hidelwallet");
    if (socialLoginSDK && socialLoginSDK.provider) {
      socialLoginSDK.hideWallet();
    }
  }, [address, socialLoginSDK]);

  const connect = useCallback(async () => {
    if (address) return;
    if (socialLoginSDK?.provider) {
      setLoading(true);
      console.info("socialLoginSDK.provider", socialLoginSDK.provider);
      const web3Provider = new ethers.providers.Web3Provider(
        socialLoginSDK.provider
      );
      const signer = web3Provider.getSigner();
      const gotAccount = await signer.getAddress();
      const network = await web3Provider.getNetwork();
      setWeb3State({
        provider: socialLoginSDK.provider,
        web3Provider: web3Provider,
        ethersProvider: web3Provider,
        address: gotAccount,
        chainId: Number(network.chainId),
      });
      setLoading(false);
      return;
    }
    if (socialLoginSDK) {
      socialLoginSDK.showWallet();
      return socialLoginSDK;
    }
    setLoading(true);
    const sdk = await getSocialLoginSDK(ethers.utils.hexValue(80001));
    sdk.showConnectModal();
    sdk.showWallet();
    setSocialLoginSDK(sdk);
    setLoading(false);
    return socialLoginSDK;
  }, [address, socialLoginSDK]);

  // after social login -> set provider info
  useEffect(() => {
    (async () => {
      if (window && (window as any).location.hash && !address) {
        const sdk = await getSocialLoginSDK(ethers.utils.hexValue(80001));
        setSocialLoginSDK(sdk);
      }
    })();
  }, [connect, address]);

  // after metamask login -> get provider event
  useEffect(() => {
    const interval = setInterval(async () => {
      if (address) {
        clearInterval(interval);
      }
      if (socialLoginSDK && !address) {
        connect();
      }
    }, 1000);
    return () => {
      clearInterval(interval);
    };
  }, [address, connect, socialLoginSDK]);

  const disconnect = useCallback(async () => {
    if (!socialLoginSDK || !socialLoginSDK.web3auth) {
      console.error("Web3Modal not initialized.");
      return;
    }
    await socialLoginSDK.logout();
    setWeb3State({
      provider: null,
      web3Provider: null,
      ethersProvider: null,
      address: "",
      chainId: activeChainId,
    });
    (window as any).getSocialLoginSDK = null;
    socialLoginSDK.hideWallet();
    setSocialLoginSDK(null);
  }, [socialLoginSDK]);

  return (
    <Web3AuthContext.Provider
      value={{
        connect,
        disconnect,
        loading,
        provider: provider,
        ethersProvider: ethersProvider || null,
        web3Provider: web3Provider || null,
        chainId: chainId || 0,
        address: address || "",
      }}
    >
      {children}
    </Web3AuthContext.Provider>
  );
};
