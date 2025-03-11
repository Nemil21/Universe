import { ApolloServer } from 'apollo-server-micro';
import { gql } from 'apollo-server-micro';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { getServerSupabase } from '../../lib/supabase';
import Mixpanel from 'mixpanel';
import { NextApiRequest, NextApiResponse } from 'next';
import { User } from '@supabase/supabase-js';

// Define interface for AI response
interface AIResponse {
  id: string;
  provider: string;
  prompt: string;
  response: string;
  createdAt: string;
  chatId?: string;
}

// Define interface for Chat
interface Chat {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages?: AIResponse[];
}

// Define interface for the context
interface Context {
  user: User | null;
  req: NextApiRequest;
}

// Initialize analytics
const mixpanel = Mixpanel.init(process.env.MIXPANEL_TOKEN || '');

// GraphQL Schema
const typeDefs = gql`
  type Query {
    getAIResponse(provider: String!, prompt: String!, chatId: String): AIResponse!
    getPromptHistory: [AIResponse!]!
    getChats: [Chat!]!
    getChatById(chatId: String!): Chat
  }
  
  type AIResponse {
    id: ID
    provider: String!
    prompt: String!
    response: String!
    createdAt: String
    chatId: String
  }
  
  type Chat {
    id: ID!
    title: String!
    createdAt: String!
    updatedAt: String!
    messages: [AIResponse!]!
  }
  
  type Mutation {
    savePrompt(provider: String!, prompt: String!, response: String!, chatId: String): AIResponse!
    createChat(title: String): Chat!
    updateChatTitle(chatId: String!, title: String!): Chat!
    deleteChat(chatId: String!): Boolean!
  }
`;

// Type the resolver arguments
interface GetAIResponseArgs {
  provider: string;
  prompt: string;
  chatId?: string;
}

interface SavePromptArgs {
  provider: string;
  prompt: string;
  response: string;
  chatId?: string;
}

interface CreateChatArgs {
  title?: string;
}

interface UpdateChatTitleArgs {
  chatId: string;
  title: string;
}

interface DeleteChatArgs {
  chatId: string;
}

interface GetChatByIdArgs {
  chatId: string;
}

// Resolvers with proper types
const resolvers = {
  Query: {
    getAIResponse: async (
      _: unknown, 
      { provider, prompt, chatId }: GetAIResponseArgs, 
      context: Context
    ): Promise<AIResponse> => {
      // Get user from session
      const { user } = context;
      
      console.log(`API Request: provider=${provider}, prompt length=${prompt.length}`);
      
      if (!user) {
        throw new Error('Authentication required');
      }
      
      // Call the appropriate AI provider API
      let response: string;
      
      if (provider === 'openai') {
        try {
          console.log('Calling OpenAI API...');
          // Call OpenAI API
          const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
              model: 'gpt-3.5-turbo',
              messages: [
                {
                  role: 'user',
                  content: prompt
                }
              ],
              max_tokens: 500
            })
          });
          
          // Check for HTTP errors
          if (!openaiResponse.ok) {
            const errorText = await openaiResponse.text();
            console.error(`OpenAI API HTTP error ${openaiResponse.status}:`, errorText);
            throw new Error(`OpenAI API returned status ${openaiResponse.status}: ${errorText}`);
          }
          
          const data = await openaiResponse.json();
          console.log('OpenAI API response structure:', Object.keys(data).join(', '));
          
          if ('error' in data) {
            throw new Error(`OpenAI API Error: ${data.error.message}`);
          }
          
          response = data.choices[0].message.content;
          console.log('OpenAI response received:', response.substring(0, 50) + '...');
        } catch (error: any) {
          console.error('OpenAI API Error:', error);
          throw new Error(`Failed to get response from OpenAI: ${error.message}`);
        }
      } 
      else if (provider === 'gemini') {
        try {
          console.log('Calling Gemini API...');
          
          const geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent';
          const apiKey = process.env.GEMINI_API_KEY;
          
          if (!apiKey) {
            throw new Error('Gemini API key not configured');
          }
          
          console.log('Using Gemini API URL with key');
          
          // Properly formatted request for Gemini API
          const geminiResponse = await fetch(`${geminiUrl}?key=${apiKey}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: prompt
                }]
              }],
              generationConfig: {
                maxOutputTokens: 500,
                temperature: 0.7
              }
            })
          });
          
          // Check if response is OK before trying to parse JSON
          if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text();
            console.error('Gemini API HTTP error:', geminiResponse.status, errorText);
            throw new Error(`Gemini API returned status ${geminiResponse.status}: ${errorText}`);
          }
          
          const responseText = await geminiResponse.text();
          console.log('Raw Gemini response:', responseText.substring(0, 100) + '...');
          
          // Only try to parse if we have content
          if (!responseText || responseText.trim() === '') {
            throw new Error('Empty response from Gemini API');
          }
          
          const data = JSON.parse(responseText);
          console.log('Parsed Gemini response structure:', Object.keys(data).join(', '));
          
          if (data.error) {
            throw new Error(`Gemini API Error: ${data.error.message}`);
          }
          
          // Extract the response text correctly according to Gemini API structure
          if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
            response = data.candidates[0].content.parts[0].text;
            console.log('Gemini response extracted:', response.substring(0, 50) + '...');
          } else {
            console.error('Unexpected Gemini API response structure:', data);
            throw new Error('Unexpected Gemini API response structure');
          }
        } catch (error: any) {
          console.error('Gemini API Error:', error);
          throw new Error(`Failed to get response from Gemini: ${error.message}`);
        }
      }
      // Add Anthropic implementation
      else if (provider === 'anthropic') {
        try {
          console.log('Calling Anthropic API...');
          const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': process.env.ANTHROPIC_API_KEY || '',
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
              model: 'claude-3-haiku-20240307',
              max_tokens: 500,
              messages: [
                {
                  role: 'user',
                  content: prompt
                }
              ]
            })
          });
          
          // Check for HTTP errors
          if (!anthropicResponse.ok) {
            const errorText = await anthropicResponse.text();
            console.error(`Anthropic API HTTP error ${anthropicResponse.status}:`, errorText);
            throw new Error(`Anthropic API returned status ${anthropicResponse.status}: ${errorText}`);
          }
          
          const data = await anthropicResponse.json();
          
          if (data.error) {
            throw new Error(`Anthropic API Error: ${data.error.message}`);
          }
          
          response = data.content[0].text;
          console.log('Anthropic response received:', response.substring(0, 50) + '...');
        } catch (error: any) {
          console.error('Anthropic API Error:', error);
          throw new Error(`Failed to get response from Anthropic: ${error.message}`);
        }
      }
      // Add Mistral implementation
      else if (provider === 'mistral') {
        try {
          console.log('Calling Mistral API...');
          const mistralResponse = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.MISTRAL_API_KEY || ''}`
            },
            body: JSON.stringify({
              model: 'mistral-tiny',
              messages: [
                {
                  role: 'user',
                  content: prompt
                }
              ],
              max_tokens: 500
            })
          });
          
          // Check for HTTP errors
          if (!mistralResponse.ok) {
            const errorText = await mistralResponse.text();
            console.error(`Mistral API HTTP error ${mistralResponse.status}:`, errorText);
            throw new Error(`Mistral API returned status ${mistralResponse.status}: ${errorText}`);
          }
          
          const data = await mistralResponse.json();
          
          if (data.error) {
            throw new Error(`Mistral API Error: ${data.error.message}`);
          }
          
          response = data.choices[0].message.content;
          console.log('Mistral response received:', response.substring(0, 50) + '...');
        } catch (error: any) {
          console.error('Mistral API Error:', error);
          throw new Error(`Failed to get response from Mistral: ${error.message}`);
        }
      }
      else {
        throw new Error(`Provider ${provider} not supported`);
      }
      
      // Check if we have a chat ID, if not create a new chat
      let chatIdToUse = chatId;
      const supabase = getServerSupabase();
      
      if (!chatIdToUse) {
        // Create a new chat with title based on prompt
        const title = prompt.length > 30 ? prompt.substring(0, 30) + "..." : prompt;
        const { data: chatData, error: chatError } = await supabase
          .from('chats')
          .insert({
            user_id: user.id,
            title: title
          })
          .select('id')
          .single();
          
        if (chatError) {
          console.error('Error creating chat:', chatError);
          throw new Error(`Failed to create chat: ${chatError.message}`);
        }
        
        chatIdToUse = chatData.id;
      }
      
      // Save prompt to database
      const { data, error } = await supabase
        .from('prompts')
        .insert({
          user_id: user.id,
          provider,
          prompt,
          response,
          chat_id: chatIdToUse,
          metadata: { ip: context.req.headers['x-forwarded-for'] || 'unknown' }
        })
        .select('*')
        .single();
      
      if (error) {
        console.error('Error saving prompt:', error);
        throw new Error(`Failed to save prompt: ${error.message}`);
      }
      
      // Update chat's updated_at timestamp
      await supabase
        .from('chats')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', chatIdToUse);
      
      // Track with Mixpanel
      try {
        mixpanel.track('AI Response Generated', {
          distinct_id: user.id,
          provider,
          prompt_length: prompt.length,
          response_length: response.length,
          chat_id: chatIdToUse,
          timestamp: new Date().toISOString()
        });
      } catch (mixpanelError) {
        console.error('Mixpanel tracking error:', mixpanelError);
        // Continue even if analytics fails
      }
      
      console.log('Sending AI response back to client');
      
      return {
        id: data.id,
        provider,
        prompt,
        response,
        createdAt: data.created_at,
        chatId: chatIdToUse
      };
    },
    
    getPromptHistory: async (
      _: unknown, 
      __: unknown, 
      context: Context
    ): Promise<AIResponse[]> => {
      const { user } = context;
      
      if (!user) {
        throw new Error('Authentication required');
      }
      
      const supabase = getServerSupabase();
      
      const { data, error } = await supabase
        .from('prompts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
        
      if (error) {
        console.error('Error fetching prompt history:', error);
        throw new Error(`Failed to fetch prompt history: ${error.message}`);
      }
      
      return data.map(item => ({
        id: item.id,
        provider: item.provider,
        prompt: item.prompt,
        response: item.response,
        createdAt: item.created_at,
        chatId: item.chat_id
      }));
    },
    
    getChats: async (
      _: unknown, 
      __: unknown, 
      context: Context
    ): Promise<Chat[]> => {
      const { user } = context;
      
      if (!user) {
        throw new Error('Authentication required');
      }
      
      const supabase = getServerSupabase();
      
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching chats:', error);
        throw new Error(`Failed to fetch chats: ${error.message}`);
      }
      
      return data.map(chat => ({
        id: chat.id,
        title: chat.title,
        createdAt: chat.created_at,
        updatedAt: chat.updated_at
      }));
    },
    
    getChatById: async (
      _: unknown, 
      { chatId }: GetChatByIdArgs, 
      context: Context
    ): Promise<Chat> => {
      const { user } = context;
      
      if (!user) {
        throw new Error('Authentication required');
      }
      
      const supabase = getServerSupabase();
      
      // Get the chat
      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .select('*')
        .eq('id', chatId)
        .eq('user_id', user.id)
        .single();
        
      if (chatError) {
        console.error('Error fetching chat:', chatError);
        throw new Error(`Failed to fetch chat: ${chatError.message}`);
      }
      
      // Get the messages for this chat
      const { data: messages, error: messagesError } = await supabase
        .from('prompts')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });
        
      if (messagesError) {
        console.error('Error fetching chat messages:', messagesError);
        throw new Error(`Failed to fetch chat messages: ${messagesError.message}`);
      }
      
      return {
        id: chat.id,
        title: chat.title,
        createdAt: chat.created_at,
        updatedAt: chat.updated_at,
        messages: messages.map(msg => ({
          id: msg.id,
          provider: msg.provider,
          prompt: msg.prompt,
          response: msg.response,
          createdAt: msg.created_at,
          chatId: msg.chat_id
        }))
      };
    }
  },
  
  Mutation: {
    savePrompt: async (
      _: unknown, 
      { provider, prompt, response, chatId }: SavePromptArgs, 
      context: Context
    ): Promise<AIResponse> => {
      const { user } = context;
      
      if (!user) {
        throw new Error('Authentication required');
      }
      
      const supabase = getServerSupabase();
      
      // Check if we have a chat ID, if not create a new chat
      let chatIdToUse = chatId;
      
      if (!chatIdToUse) {
        // Create a new chat with title based on prompt
        const title = prompt.length > 30 ? prompt.substring(0, 30) + "..." : prompt;
        const { data: chatData, error: chatError } = await supabase
          .from('chats')
          .insert({
            user_id: user.id,
            title: title
          })
          .select('id')
          .single();
          
        if (chatError) {
          console.error('Error creating chat:', chatError);
          throw new Error(`Failed to create chat: ${chatError.message}`);
        }
        
        chatIdToUse = chatData.id;
      }
      
      const { data, error } = await supabase
        .from('prompts')
        .insert({
          user_id: user.id,
          provider,
          prompt,
          response,
          chat_id: chatIdToUse
        })
        .select('*')
        .single();
      
      if (error) {
        console.error('Error saving prompt:', error);
        throw new Error(`Failed to save prompt: ${error.message}`);
      }
      
      // Update chat's updated_at timestamp
      await supabase
        .from('chats')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', chatIdToUse);
      
      return {
        id: data.id,
        provider,
        prompt,
        response,
        createdAt: data.created_at,
        chatId: chatIdToUse
      };
    },
    
    createChat: async (
      _: unknown, 
      { title = "New Chat" }: CreateChatArgs, 
      context: Context
    ): Promise<Chat> => {
      const { user } = context;
      
      if (!user) {
        throw new Error('Authentication required');
      }
      
      const supabase = getServerSupabase();
      
      const { data, error } = await supabase
        .from('chats')
        .insert({
          user_id: user.id,
          title
        })
        .select('*')
        .single();
      
      if (error) {
        console.error('Error creating chat:', error);
        throw new Error(`Failed to create chat: ${error.message}`);
      }
      
      return {
        id: data.id,
        title: data.title,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        messages: []
      };
    },
    
    updateChatTitle: async (
      _: unknown, 
      { chatId, title }: UpdateChatTitleArgs, 
      context: Context
    ): Promise<Chat> => {
      const { user } = context;
      
      if (!user) {
        throw new Error('Authentication required');
      }
      
      const supabase = getServerSupabase();
      
      const { data, error } = await supabase
        .from('chats')
        .update({ title })
        .eq('id', chatId)
        .eq('user_id', user.id)
        .select('*')
        .single();
      
      if (error) {
        console.error('Error updating chat title:', error);
        throw new Error(`Failed to update chat title: ${error.message}`);
      }
      
      return {
        id: data.id,
        title: data.title,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    },
    
    deleteChat: async (
      _: unknown, 
      { chatId }: DeleteChatArgs, 
      context: Context
    ): Promise<boolean> => {
      const { user } = context;
      
      if (!user) {
        throw new Error('Authentication required');
      }
      
      const supabase = getServerSupabase();
      
      // Delete all prompts in the chat first (due to foreign key constraint)
      const { error: promptsError } = await supabase
        .from('prompts')
        .delete()
        .eq('chat_id', chatId);
      
      if (promptsError) {
        console.error('Error deleting chat prompts:', promptsError);
        throw new Error(`Failed to delete chat prompts: ${promptsError.message}`);
      }
      
      // Then delete the chat
      const { error } = await supabase
        .from('chats')
        .delete()
        .eq('id', chatId)
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Error deleting chat:', error);
        throw new Error(`Failed to delete chat: ${error.message}`);
      }
      
      return true;
    }
  },
};

const schema = makeExecutableSchema({ typeDefs, resolvers });

// Define Apollo Server configuration type
interface ApolloContext {
  req: NextApiRequest;
  user: User | null;
}

// Create Apollo Server
const apolloServer = new ApolloServer({
  schema,
  context: async ({ req }: { req: NextApiRequest }): Promise<ApolloContext> => {
    // Get user session from Supabase auth
    const supabase = getServerSupabase();
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return { user: null, req };
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    try {
      const { data, error } = await supabase.auth.getUser(token);
      
      if (error || !data?.user) {
        console.error('Auth error:', error);
        return { user: null, req };
      }
      
      return {
        user: data.user,
        req
      };
    } catch (error) {
      console.error('Error in auth context:', error);
      return { user: null, req };
    }
  },
  formatError: (error) => {
    console.error('GraphQL error:', error);
    return error;
  },
});

// Need to initialize Apollo Server before handling requests
let apolloServerHandler: any; // This is acceptable for the handler initialization

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  // Add CORS headers if needed
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  try {
    if (!apolloServerHandler) {
      await apolloServer.start();
      apolloServerHandler = apolloServer.createHandler({ path: '/api/graphql' });
    }
    
    // Call the handler and return the result
    return apolloServerHandler(req, res);
  } catch (error) {
    console.error('Error in GraphQL handler:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}