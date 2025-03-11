import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { supabase } from './supabase';

// HTTP connection to the API
const httpLink = createHttpLink({
  uri: '/api/graphql',
});

// Auth middleware to add token to requests
const authLink = setContext(async (_, { headers }) => {
  // Get auth token from Supabase session
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    }
  };
});

// Initialize Apollo Client
const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});

export default client;