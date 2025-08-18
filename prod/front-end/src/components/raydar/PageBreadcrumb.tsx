import { Box, Breadcrumbs, Typography } from '@mui/material'
import { Link } from 'react-router-dom'
import { ChevronRight } from '@mui/icons-material'

type PageBreadcrumbProps = {
  subName: string
  title: string
}

const PageBreadcrumb = ({ subName, title }: PageBreadcrumbProps) => {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h4" sx={{ mb: 1 }}>
        {title}
      </Typography>
      <Breadcrumbs separator={<ChevronRight fontSize="small" />} aria-label="breadcrumb">
        <Link 
          to="#" 
          style={{ 
            textDecoration: 'none', 
            color: 'inherit',
            '&:hover': { textDecoration: 'underline' }
          }}
        >
          {subName}
        </Link>
        <Typography color="text.primary">{title}</Typography>
      </Breadcrumbs>
    </Box>
  )
}

export default PageBreadcrumb