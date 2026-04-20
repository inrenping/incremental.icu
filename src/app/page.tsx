'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    // TODO 判读 token 有效性
    if (token) {
      router.replace('/dash')
    } else {
      router.replace('/login')
    }
  }, [router])

  return <div className="h-screen flex items-center justify-center">Loading...</div>
}