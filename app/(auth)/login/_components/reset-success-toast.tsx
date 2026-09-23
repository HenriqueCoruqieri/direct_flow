"use client"

import { useEffect } from "react"
import { toast } from "sonner"

const RESET_SUCCESS_MESSAGE = "Senha redefinida. Entre com a nova senha."

const ResetSuccessToast = () => {
  useEffect(() => {
    toast.success(RESET_SUCCESS_MESSAGE, { id: "reset-success" })
  }, [])

  return null
}

export default ResetSuccessToast
