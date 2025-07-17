"use client"

import { signOut, useSession } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'
import React from 'react'

const Dashboard = () => {
  const router = useRouter();
  const { data: session, isPending, error } = useSession();

  if (isPending) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <p>DASBOARD</p>

      <pre style={{ background: '#f5f5f5', padding: '1rem', marginBottom: '1rem' }}>
        {JSON.stringify(session, null, 2)}
      </pre>

      <button onClick={() => signOut({
        fetchOptions: {
          onSuccess: () => {
            router.push("/sign-in")
          }
        }
      })}>Sign out</button>

    </div>
  )
}

export default Dashboard