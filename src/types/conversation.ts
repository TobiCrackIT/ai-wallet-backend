/**
 * Conversation and AI-related type definitions
 */

import type { WalletData } from './wallet.js';

export interface ConversationMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    id?: string;
    metadata?: {
        walletAddress?: string;
        contextReferences?: string[];
        processingTime?: number;
    };
}

export interface ConversationContext {
    walletAddress: string;
    previousQueries: string[];
    walletDataSnapshot: WalletData;
    conversationHistory: ConversationMessage[];
    sessionId: string;
    createdAt: number;
    lastUpdated: number;
    messageCount: number;
    contextWindow: number; // Maximum messages to keep for AI context
}

export interface ContextOptimization {
    maxMessages: number;
    maxAge: number; // Maximum age in milliseconds
    compressionThreshold: number; // When to start compressing old messages
    keywordExtraction: boolean;
}

export interface ConversationSession {
    sessionId: string;
    walletAddress: string;
    messages: ConversationMessage[];
    createdAt: number;
    lastActivity: number;
    isActive: boolean;
}

export interface ContextReference {
    type: 'pronoun' | 'temporal' | 'entity' | 'transaction' | 'token';
    original: string;
    resolved: string;
    confidence: number;
    messageIndex?: number;
}

export interface AIResponse {
    content: string;
    confidence?: number;
    sources?: string[];
    timestamp: number;
    contextReferences?: ContextReference[];
    processingTime?: number;
}

export interface ChatState {
    messages: ConversationMessage[];
    isLoading: boolean;
    error: string | null;
    context: ConversationContext | null;
    sessions: Map<string, ConversationSession>;
    currentSessionId: string | null;
    optimization: ContextOptimization;
}