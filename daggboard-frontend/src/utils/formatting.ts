import { ethers } from 'ethers';

export interface TokenMetadata {
  name: string;
  symbol: string;
  decimals?: number;
}

/**
 * Format a token amount for display
 */
export function formatTokenAmount(
  amount: string | number | bigint,
  decimals: number = 18,
  precision: number = 4
): string {
  try {
    // Handle null, undefined, or empty string
    if (amount === null || amount === undefined || amount === '') {
      return '0';
    }

    // Convert to string first to handle very large numbers
    const amountStr = amount.toString();
    
    // Handle non-numeric strings
    if (isNaN(Number(amountStr)) && !/^\d+$/.test(amountStr)) {
      return '0';
    }

    const amountBN = BigInt(amountStr);
    const divisor = BigInt(10 ** decimals);
    
    if (amountBN === BigInt(0)) return '0';
    
    const whole = amountBN / divisor;
    const remainder = amountBN % divisor;
    
    if (remainder === BigInt(0)) {
      return whole.toLocaleString();
    }
    
    // For decimal part, convert remainder to string and pad with zeros
    const remainderStr = remainder.toString().padStart(decimals, '0');
    const decimalPart = remainderStr.substring(0, precision);
    
    // Remove trailing zeros from decimal part
    const trimmedDecimal = decimalPart.replace(/0+$/, '');
    
    if (trimmedDecimal === '') {
      return whole.toLocaleString();
    }
    
    return `${whole.toLocaleString()}.${trimmedDecimal}`;
  } catch (error) {
    console.error('Error formatting token amount:', error, 'Input:', amount);
    return amount?.toString() || '0';
  }
}

/**
 * Format a large number with K, M, B suffixes
 */
export function formatCompactNumber(num: number): string {
  if (num === 0) return '0';
  
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  
  if (abs >= 1e9) {
    return `${sign}${(abs / 1e9).toFixed(1)}B`;
  } else if (abs >= 1e6) {
    return `${sign}${(abs / 1e6).toFixed(1)}M`;
  } else if (abs >= 1e3) {
    return `${sign}${(abs / 1e3).toFixed(1)}K`;
  } else {
    return num.toLocaleString();
  }
}

/**
 * Format already-decimal numbers with limited decimal places
 * Keeps scientific notation for very large numbers, just trims decimals
 */
export function formatDecimalAmount(
  amount: string | number,
  precision: number = 2
): string {
  try {
    if (!amount || amount === '0' || amount === 0) {
      return '0';
    }

    // Handle string inputs that might be in scientific notation
    let numValue: number;
    if (typeof amount === 'string') {
      numValue = parseFloat(amount);
    } else {
      numValue = amount;
    }

    // Check if the number is invalid
    if (!isFinite(numValue) || isNaN(numValue)) {
      return '0';
    }

    // For very large numbers (scientific notation), format with limited precision
    // Use scientific notation for numbers >= 1e15 (15+ digits) or very small numbers
    if (Math.abs(numValue) >= 1e15 || Math.abs(numValue) < 1e-6) {
      // Use toExponential with the specified precision to properly round
      return numValue.toExponential(precision);
    }

    // For normal numbers, use regular formatting with limited decimal places
    return numValue.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: precision
    });

  } catch (error) {
    console.error('Error formatting decimal amount:', error, 'Input:', amount);
    return amount?.toString() || '0';
  }
}

/**
 * Parse metadata hex string to extract token information
 */
export function parseTokenMetadata(metadataHex: string): TokenMetadata {
  try {
    if (!metadataHex || metadataHex === '0x') {
      return { name: 'Unknown Token', symbol: 'UNKNOWN' };
    }
    
    // Remove '0x' prefix
    const hex = metadataHex.startsWith('0x') ? metadataHex.slice(2) : metadataHex;
    
    if (hex.length === 0) {
      return { name: 'Unknown Token', symbol: 'UNKNOWN' };
    }
    
    // Try to decode as ABI encoded string tuple (name, symbol)
    try {
      const decoded = ethers.AbiCoder.defaultAbiCoder().decode(['string', 'string'], '0x' + hex);
      return {
        name: decoded[0] || 'Unknown Token',
        symbol: decoded[1] || 'UNKNOWN',
      };
    } catch {
      // If ABI decoding fails, try simple hex to string conversion
      try {
        const bytes = Buffer.from(hex, 'hex');
        const text = bytes.toString('utf8').replace(/\0/g, '');
        
        if (text.length > 0) {
          // Try to split by common separators
          const parts = text.split(/[,;|]/);
          if (parts.length >= 2) {
            return {
              name: parts[0].trim() || 'Unknown Token',
              symbol: parts[1].trim() || 'UNKNOWN',
            };
          } else {
            return {
              name: text.trim() || 'Unknown Token',
              symbol: 'UNKNOWN',
            };
          }
        }
      } catch {
        // Ignore hex parsing errors
      }
    }
    
    return { name: 'Unknown Token', symbol: 'UNKNOWN' };
  } catch (error) {
    console.error('Error parsing token metadata:', error);
    return { name: 'Unknown Token', symbol: 'UNKNOWN' };
  }
}

/**
 * Shorten an Ethereum address for display
 */
export function shortenAddress(address: string, chars: number = 4): string {
  if (!address) return '';
  if (address.length <= 2 * chars + 2) return address;
  
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Format a block number with proper spacing
 */
export function formatBlockNumber(blockNumber: number | bigint): string {
  return blockNumber.toLocaleString();
}

/**
 * Calculate percentage with proper formatting
 */
export function formatPercentage(value: number, total: number, precision: number = 1): string {
  if (total === 0) return '0%';
  const percentage = (value / total) * 100;
  return `${percentage.toFixed(precision)}%`;
}

/**
 * Format timestamp to relative time
 */
export function formatRelativeTime(timestamp: number | Date): string {
  const now = new Date().getTime();
  const time = typeof timestamp === 'number' ? timestamp : timestamp.getTime();
  const diff = now - time;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else {
    return `${seconds} second${seconds > 1 ? 's' : ''} ago`;
  }
}

/**
 * Get the status indicator emoji and text based on balance difference
 */
export function getBalanceStatus(difference: string | number): {
  emoji: string;
  text: string;
  color: string;
} {
  const diff = typeof difference === 'string' ? parseFloat(difference) : difference;
  
  if (diff > 0) {
    return {
      emoji: '✅',
      text: 'Healthy',
      color: 'text-green-600',
    };
  } else if (diff === 0) {
    return {
      emoji: '⚖️',
      text: 'Balanced',
      color: 'text-blue-600',
    };
  } else {
    return {
      emoji: '⚠️',
      text: 'Undercollateralized',
      color: 'text-red-600',
    };
  }
}

/**
 * Get block explorer URL for different networks
 */
export function getBlockExplorerUrl(networkId: number, address: string): string {
  const explorers: Record<number, string> = {
    0: 'https://etherscan.io',
    1: 'https://zkevm.polygonscan.com',
    2: 'https://astar-zkevm.explorer.startale.com',
    3: 'https://web3.okx.com/en-eu/explorer/xlayer',
    4: 'https://oev.explorer.api3.org',
    6: 'https://witnesschain-blockscout.eu-north-2.gateway.fm',
    8: 'https://blockscout.wirexpaychain.com',
  };
  
  const baseUrl = explorers[networkId] || 'https://etherscan.io';
  return `${baseUrl}/address/${address}`;
}

/**
 * Get network name by ID
 */
export function getNetworkName(networkId: number): string {
  const networks: Record<number, string> = {
    0: 'Ethereum',
    1: 'Polygon zkEVM',
    2: 'Astar zkEVM',
    3: 'X Layer',
    4: 'API3 OEV Network',
    5: 'Unknown Network',
    6: 'Witness Chain',
    7: 'Unknown Network',
    8: 'Wirex Pay Chain',
  };
  
  return networks[networkId] || `Network ${networkId}`;
}