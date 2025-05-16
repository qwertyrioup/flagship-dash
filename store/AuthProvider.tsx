"use client"; // Add this directive at the very top

import React from 'react';
import { AuthProvider } from './AuthContext';

export function AuthStoreProvider({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}