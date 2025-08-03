import React from 'react'
import styled from 'styled-components'

const StyledButton = styled.button`
  background-color: #007bff
  color: white
  border: none
  padding: 10px 20px
  border-radius: 4px
  font-size: 16px
  cursor: pointer
  transition: background-color 0.3s

  &:hover {
    background-color: #0056b3
  }

  &:active {
    background-color: #004085
  }
`

export const PrimaryButton = ({ children }: { children: React.ReactNode }) => {
  return <StyledButton>{children}</StyledButton>
}