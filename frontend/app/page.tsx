'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Spin } from 'antd'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // 檢查是否已登入，如果有 token 就導向對應頁面
    const token = localStorage.getItem('token')
    const userRole = localStorage.getItem('userRole')

    if (token && userRole) {
      if (userRole === 'admin') {
        router.push('/admin')
      } else {
        router.push('/team')
      }
    } else {
      router.push('/login')
    }
  }, [router])

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh'
    }}>
      <Spin size="large" />
    </div>
  )
}
