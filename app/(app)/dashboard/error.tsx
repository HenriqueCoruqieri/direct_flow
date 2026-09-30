"use client"

import { RotateCwIcon } from "lucide-react"

import { Button } from "@/app/_components/ui/button"

import AppTopBar from "../_components/app-top-bar"

interface DashboardErrorProps {
  error: Error & { digest?: string }
  retry: () => void
}

const DashboardError = ({ retry }: DashboardErrorProps) => {
  return (
    <>
      <AppTopBar />
      <div className="flex flex-col items-start gap-3 px-5 pt-5 lg:px-6">
        <h1 className="font-heading text-title font-semibold">Início</h1>
        <p className="text-sm text-muted-foreground">
          Não foi possível carregar os indicadores agora.
        </p>
        <Button type="button" variant="outline" onClick={() => retry()}>
          <RotateCwIcon aria-hidden="true" className="size-4" />
          Tentar novamente
        </Button>
      </div>
    </>
  )
}

export default DashboardError
