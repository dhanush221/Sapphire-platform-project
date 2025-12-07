import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { BrowserRouter } from 'react-router-dom'

// Mock api to prevent network calls during tests
vi.mock('./lib/api.js', () => ({
    default: {
        currentUser: vi.fn().mockRejectedValue(new Error('Network error')),
    },
    setUnauthorizedHandler: vi.fn(),
}))

describe('App', () => {
    it('renders loading state initially', () => {
        render(
            <BrowserRouter>
                <AuthProvider>
                    <App />
                </AuthProvider>
            </BrowserRouter>
        )
        expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })
})
