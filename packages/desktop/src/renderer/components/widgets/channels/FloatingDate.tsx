import React from 'react'
import { styled } from '@mui/material/styles'
import { Grid, Typography } from '@mui/material'

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
    background: theme.palette.background.default,
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: theme.shadows[2],
    borderRadius: '72px',
    zIndex: 1000,
    transition: 'opacity 200ms ease-out',
  },
}))

interface FloatingDateProps {
  title: string
  isVisible?: boolean
}

export const FloatingDate: React.FC<FloatingDateProps> = ({ title, isVisible = false }) => {
  return (
    <StyledGrid container justifyContent='center' alignItems='center'>
      <Grid item xs />
      <Grid
        item
        className={classes.titleDiv}
        style={{
          opacity: isVisible ? 1 : 0,
        }}
      >
        <Typography variant='body1'>{title}</Typography>
      </Grid>
      <Grid item xs />
    </StyledGrid>
  )
}

export default FloatingDate
