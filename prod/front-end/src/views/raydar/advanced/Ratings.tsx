import React, { useState } from 'react'
import { 
  Rating, 
  Typography, 
  Box, 
  Grid,
  TextField,
  FormControl,
  FormLabel
} from '@mui/material'
import { 
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon
} from '@mui/icons-material'
import ComponentContainerCard from 'src/components/raydar/ComponentContainerCard'
import PageBreadcrumb from 'src/components/raydar/PageBreadcrumb'

const BasicRating = () => {
  const [value, setValue] = useState<number | null>(2)

  return (
    <ComponentContainerCard
      id="basic-rating"
      title="Basic Rating"
      description="The rating component allows users to input a rating by selecting from a range of values."
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box>
          <Typography component="legend">Controlled Rating</Typography>
          <Rating
            name="simple-controlled"
            value={value}
            onChange={(event, newValue) => {
              setValue(newValue)
            }}
          />
        </Box>
        
        <Box>
          <Typography component="legend">Read Only</Typography>
          <Rating name="read-only" value={4} readOnly />
        </Box>
        
        <Box>
          <Typography component="legend">Disabled</Typography>
          <Rating name="disabled" value={3} disabled />
        </Box>
        
        <Box>
          <Typography component="legend">No Rating Given</Typography>
          <Rating name="no-value" value={null} />
        </Box>
      </Box>
    </ComponentContainerCard>
  )
}

const RatingPrecision = () => {
  return (
    <ComponentContainerCard
      id="rating-precision"
      title="Rating Precision"
      description="The rating can display any float number with the precision prop."
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box>
          <Typography component="legend">Half Rating</Typography>
          <Rating name="half-rating" defaultValue={2.5} precision={0.5} />
        </Box>
        
        <Box>
          <Typography component="legend">0.1 Precision</Typography>
          <Rating name="precision-rating" defaultValue={2.3} precision={0.1} />
        </Box>
        
        <Box>
          <Typography component="legend">Read Only Half Rating</Typography>
          <Rating name="half-rating-read" defaultValue={2.5} precision={0.5} readOnly />
        </Box>
      </Box>
    </ComponentContainerCard>
  )
}

const HoverFeedback = () => {
  const [value, setValue] = useState<number | null>(2)
  const [hover, setHover] = useState(-1)

  const labels: { [index: string]: string } = {
    1: 'Useless',
    2: 'Poor',
    3: 'Ok',
    4: 'Good',
    5: 'Excellent',
  }

  function getLabelText(value: number) {
    return `${value} Star${value !== 1 ? 's' : ''}, ${labels[value]}`
  }

  return (
    <ComponentContainerCard
      id="hover-feedback"
      title="Hover Feedback"
      description="You can display a label on hover to help users pick the correct rating value."
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Rating
          name="hover-feedback"
          value={value}
          precision={0.5}
          getLabelText={getLabelText}
          onChange={(event, newValue) => {
            setValue(newValue)
          }}
          onChangeActive={(event, newHover) => {
            setHover(newHover)
          }}
          emptyIcon={<StarBorderIcon style={{ opacity: 0.55 }} fontSize="inherit" />}
        />
        {value !== null && (
          <Box sx={{ ml: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {labels[hover !== -1 ? hover : value]}
            </Typography>
          </Box>
        )}
      </Box>
    </ComponentContainerCard>
  )
}

const RatingSizes = () => {
  return (
    <ComponentContainerCard
      id="rating-sizes"
      title="Rating Sizes"
      description="For larger or smaller ratings use the size prop."
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box>
          <Typography component="legend">Small</Typography>
          <Rating name="size-small" defaultValue={2} size="small" />
        </Box>
        
        <Box>
          <Typography component="legend">Medium (Default)</Typography>
          <Rating name="size-medium" defaultValue={2} />
        </Box>
        
        <Box>
          <Typography component="legend">Large</Typography>
          <Rating name="size-large" defaultValue={2} size="large" />
        </Box>
      </Box>
    </ComponentContainerCard>
  )
}

const CustomizedRating = () => {
  return (
    <ComponentContainerCard
      id="customized-rating"
      title="Customized Rating"
      description="You can customize the icons by setting the icon and emptyIcon props."
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box>
          <Typography component="legend">Custom Icon and Color</Typography>
          <Rating
            name="customized-color"
            defaultValue={2}
            getLabelText={(value: number) => `${value} Heart${value !== 1 ? 's' : ''}`}
            precision={0.5}
            icon={<FavoriteIcon fontSize="inherit" />}
            emptyIcon={<FavoriteBorderIcon fontSize="inherit" />}
            sx={{
              '& .MuiRating-iconFilled': {
                color: '#ff6d75',
              },
              '& .MuiRating-iconHover': {
                color: '#ff3d47',
              },
            }}
          />
        </Box>
        
        <Box>
          <Typography component="legend">10 Stars</Typography>
          <Rating name="customized-10" defaultValue={2} max={10} />
        </Box>
        
        <Box>
          <Typography component="legend">Custom Empty Icon</Typography>
          <Rating
            name="customized-empty"
            defaultValue={2}
            precision={0.5}
            emptyIcon={<StarIcon style={{ opacity: 0.55 }} fontSize="inherit" />}
          />
        </Box>
      </Box>
    </ComponentContainerCard>
  )
}

const RatingWithTextField = () => {
  const [rating, setRating] = useState<number | null>(4)
  const [comment, setComment] = useState('')

  return (
    <ComponentContainerCard
      id="rating-with-feedback"
      title="Rating with Feedback"
      description="Combine ratings with text feedback for comprehensive user input."
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 400 }}>
        <FormControl>
          <FormLabel component="legend">Rate your experience</FormLabel>
          <Rating
            name="experience-rating"
            value={rating}
            onChange={(event, newValue) => {
              setRating(newValue)
            }}
            size="large"
          />
        </FormControl>
        
        <TextField
          label="Tell us more about your experience"
          multiline
          rows={4}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          variant="outlined"
          fullWidth
          placeholder="Share your thoughts..."
        />
        
        <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            <strong>Rating:</strong> {rating ? `${rating}/5 stars` : 'No rating'}
          </Typography>
          {comment && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              <strong>Comment:</strong> {comment}
            </Typography>
          )}
        </Box>
      </Box>
    </ComponentContainerCard>
  )
}

const UIExamplesList = ({ examples }: { examples: Array<{ label: string; link: string }> }) => {
  return (
    <Box sx={{ position: 'sticky', top: 20 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Examples</Typography>
      <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
        {examples.map((example, index) => (
          <Box component="li" key={index} sx={{ mb: 1 }}>
            <Box 
              component="a" 
              href={example.link}
              sx={{ 
                textDecoration: 'none', 
                color: 'primary.main',
                '&:hover': { textDecoration: 'underline' }
              }}
            >
              {example.label}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  )
}

const Ratings = () => {
  return (
    <>
      <PageBreadcrumb subName="Advanced UI" title="Ratings" />
      <Grid container spacing={3}>
        <Grid item xs={12} xl={9}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <BasicRating />
            <RatingPrecision />
            <HoverFeedback />
            <RatingSizes />
            <CustomizedRating />
            <RatingWithTextField />
          </Box>
        </Grid>
        <Grid item xs={12} xl={3}>
          <UIExamplesList
            examples={[
              { label: 'Basic Rating', link: '#basic-rating' },
              { label: 'Rating Precision', link: '#rating-precision' },
              { label: 'Hover Feedback', link: '#hover-feedback' },
              { label: 'Rating Sizes', link: '#rating-sizes' },
              { label: 'Customized Rating', link: '#customized-rating' },
              { label: 'Rating with Feedback', link: '#rating-with-feedback' },
            ]}
          />
        </Grid>
      </Grid>
    </>
  )
}

export default Ratings