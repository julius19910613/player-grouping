import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

expect.extend(matchers)

// Mock scrollIntoView for jsdom
Element.prototype.scrollIntoView = vi.fn()

afterEach(() => {
  cleanup()
})