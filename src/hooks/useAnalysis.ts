// ============================================================
// useAnalysis — orchestrates parse → diff → results flow
// ============================================================

import { useState, useCallback, useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router-dom'
import { parseContractPdf } from '../services/contractParser'
import { parsePayslipPdf } from '../services/payslipParser'
import { type ProfileData } from '../services/diffEngine'
import { runMasterDiagnosis } from '../services/masterDiagnosis'
import { analysisStore } from '../lib/analysisStore'

export function useAnalysisStore() {
  return useSyncExternalStore(
    analysisStore.subscribe,
    analysisStore.getState,
  )
}

export function useAnalysis() {
  const navigate = useNavigate()
  const [isParsingContract, setIsParsingContract] = useState(false)
  const [isParsingPayslip, setIsParsingPayslip] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parseContract = useCallback(async (file: File) => {
    setIsParsingContract(true)
    setError(null)
    try {
      const terms = await parseContractPdf(file)
      analysisStore.setContract(terms, file.name)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה בפענוח החוזה')
    } finally {
      setIsParsingContract(false)
    }
  }, [])

  const parsePayslip = useCallback(async (file: File) => {
    setIsParsingPayslip(true)
    setError(null)
    try {
      const payslip = await parsePayslipPdf(file)
      analysisStore.setPayslip(payslip, file.name)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה בפענוח התלוש')
    } finally {
      setIsParsingPayslip(false)
    }
  }, [])

  const runAnalysis = useCallback((profile: ProfileData) => {
    const state = analysisStore.getState()
    if (!state.contractTerms || !state.payslip) {
      setError('חסרים נתוני חוזה או תלוש')
      return
    }

    setIsAnalyzing(true)
    setError(null)
    try {
      const result = runMasterDiagnosis(state.contractTerms, state.payslip, profile, state.payslip.year)
      analysisStore.setResult(result)
      navigate('/results')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה בניתוח')
    } finally {
      setIsAnalyzing(false)
    }
  }, [navigate])

  return {
    parseContract,
    parsePayslip,
    runAnalysis,
    isParsingContract,
    isParsingPayslip,
    isAnalyzing,
    error,
  }
}
