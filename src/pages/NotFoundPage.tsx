import { Box, Button } from '@mui/material'
import { FileQuestionMark } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { EmptyState } from '../components/common/EmptyState'

export function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 3.5, bgcolor: 'background.paper' }}>
      <EmptyState
        icon={FileQuestionMark}
        title="Page not found"
        description="That link does not point to anything in KeyNest."
        action={
          <Button variant="contained" onClick={() => navigate('/')}>
            Back to dashboard
          </Button>
        }
      />
    </Box>
  )
}
