import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'
import { useViewStore } from '@/state/viewStore'

describe('App', () => {
  it('renders the editor view by default', () => {
    render(<App />)
    expect(screen.getByText('fx-generator')).toBeInTheDocument()
    expect(screen.getByLabelText('Effektbibliotek')).toBeInTheDocument()
    expect(screen.getByLabelText('Effektstakk og egenskaper')).toBeInTheDocument()
  })

  it('switches to the showcase editor view when the Showcase tab is selected', async () => {
    useViewStore.setState({ view: 'editor' })
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('tab', { name: 'Showcase' }))

    expect(screen.getByText(/Showcase-editoren/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Effektbibliotek')).not.toBeInTheDocument()
  })
})
