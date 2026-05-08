import { createContext, useContext, useState } from 'react'

const DataContext = createContext(null)

const INITIAL_DEPARTMENTS = [
  { id: 'eng', name: 'Engineering', description: 'Software development and technical roles', color: '#6366f1', icon: 'code' },
  { id: 'design', name: 'Design', description: 'UI/UX, product, and visual design roles', color: '#ec4899', icon: 'pen' },
  { id: 'product', name: 'Product', description: 'Product management and strategy roles', color: '#f59e0b', icon: 'box' },
  { id: 'marketing', name: 'Marketing', description: 'Marketing, growth, and brand roles', color: '#22c55e', icon: 'megaphone' },
  { id: 'sales', name: 'Sales', description: 'Sales, account management, and BD roles', color: '#38bdf8', icon: 'chart' },
  { id: 'operations', name: 'Operations', description: 'Operations, HR, and admin roles', color: '#f97316', icon: 'settings' },
]

function loadData(key, fallback) {
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : fallback
  } catch { return fallback }
}

function saveData(key, data) {
  localStorage.setItem(key, JSON.stringify(data))
}

export function DataProvider({ children }) {
  const [departments, setDepartments] = useState(() => loadData('hr_departments', INITIAL_DEPARTMENTS))
  const [candidates, setCandidates] = useState(() => loadData('hr_candidates', []))

  function addDepartment(dept) {
    const updated = [...departments, { ...dept, id: Date.now().toString() }]
    setDepartments(updated)
    saveData('hr_departments', updated)
  }

  function updateDepartment(id, data) {
    const updated = departments.map(d => d.id === id ? { ...d, ...data } : d)
    setDepartments(updated)
    saveData('hr_departments', updated)
  }

  function deleteDepartment(id) {
    const updated = departments.filter(d => d.id !== id)
    setDepartments(updated)
    saveData('hr_departments', updated)
    const updatedCandidates = candidates.filter(c => c.departmentId !== id)
    setCandidates(updatedCandidates)
    saveData('hr_candidates', updatedCandidates)
  }

  function addCandidate(candidate) {
    const id = Date.now().toString()
    const newC = { ...candidate, id, createdAt: new Date().toISOString() }
    setCandidates(prev => {
      const updated = [...prev, newC]
      saveData('hr_candidates', updated)
      return updated
    })
    return id
  }

  function updateCandidate(id, data) {
    const updated = candidates.map(c => c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c)
    setCandidates(updated)
    saveData('hr_candidates', updated)
  }

  function deleteCandidate(id) {
    const updated = candidates.filter(c => c.id !== id)
    setCandidates(updated)
    saveData('hr_candidates', updated)
  }

  function getCandidatesByDept(deptId) {
    return candidates.filter(c => c.departmentId === deptId)
  }

  function getCandidate(id) {
    return candidates.find(c => c.id === id)
  }

  return (
    <DataContext.Provider value={{
      departments, candidates,
      addDepartment, updateDepartment, deleteDepartment,
      addCandidate, updateCandidate, deleteCandidate,
      getCandidatesByDept, getCandidate,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export const useData = () => useContext(DataContext)
