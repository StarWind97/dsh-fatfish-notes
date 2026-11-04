import React from 'react'

console.info('factory-body')

export function apply() {
  return { element: <span>factory works</span>, react: React }
}
