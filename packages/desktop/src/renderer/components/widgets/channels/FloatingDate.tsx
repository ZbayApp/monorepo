import React from 'react'
import { styled } from '@mui/material/styles'
import { Grid, Typography } from '@mui/material'
import zIndex from '@mui/material/styles/zIndex'

const PREFIX = 'FloatingDate'

const classes = {
  root: `${PREFIX}root`,
  divider: `${PREFIX}divider`,
  titleDiv: `${PREFIX}titleDiv`,
}

const StyledGrid = styled(Grid)(({ theme }) => ({
  [`& .${classes.root}`]: {
    padding: 0,
  },

  [`& .${classes.divider}`]: {
    height: 0,
    backgroundColor: 'transparent',
  },

  // Updated titleDiv styling with floating properties.
  [`& .${classes.titleDiv}`]: {
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '5px 18px',
    position: 'absolute',
    width: '109px',
    height: '25px',
    top: '20px',
    background: '#FFFFFF',
    border: '1px solid #F0F0F0',
    boxShadow: '0px 1px 12px rgba(0, 0, 0, 0.09)',
    borderRadius: '72px',
    zIndex: 1000, // ensures the date floats above other elements
  },
}))

interface FloatingDateProps {
  title: string
}

export const FloatingDate: React.FC<FloatingDateProps> = ({ title }) => {
  return (
    <StyledGrid container justifyContent='center' alignItems='center'>
      <Grid item xs />
      <Grid item className={classes.titleDiv}>
        <Typography variant='body1'>{title}</Typography>
      </Grid>
      <Grid item xs />
    </StyledGrid>
  )
}

export default FloatingDate
