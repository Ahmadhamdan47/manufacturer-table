"use client"

import { useState, useEffect } from "react"

interface UseLocalStorageOptions<T> {
  key: string
  defaultValue: T
}

export function useLocalStorage<T>({ key, defaultValue }: UseLocalStorageOptions<T>): [T, (value: T) => void] {
  // Get stored value from localStorage or use default
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return defaultValue
    }

    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error)
      return defaultValue
    }
  })

  // Update localStorage when value changes
  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error)
    }
  }, [key, value])

  return [value, setValue]
}
