import React from 'react'
import { styled } from '@mui/material/styles'
import { Grid, Typography } from '@mui/material'

const PREFIX = 'FloatingDate'

const classes = {
  root: `${PREFIX}root`,
  divider: `${PREFIX}divider`,
  titleDiv: `${PREFIX}titleDiv`,
  dateText: `${PREFIX}dateText`,
}

const FLOATING_DATE = {
  WIDTH: '109px',
  HEIGHT: '25px',
  TOP_OFFSET: '20px',
  PADDING: '5px 18px',
  GAP: '8px',
  FONT_SIZE: '13px',
  BORDER_RADIUS: '72px',
  Z_INDEX: 1000,
  TRANSITION_DURATION: '200ms',
} as const

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
    padding: FLOATING_DATE.PADDING,
    position: 'absolute',
    width: FLOATING_DATE.WIDTH,
    height: FLOATING_DATE.HEIGHT,
    top: FLOATING_DATE.TOP_OFFSET,
    background: theme.palette.background.default,
    border: `1px solid ${theme.palette.colors.border01}`,
    boxShadow: theme.shadows[5],
    borderRadius: FLOATING_DATE.BORDER_RADIUS,
    zIndex: FLOATING_DATE.Z_INDEX,
    transition: `opacity ${FLOATING_DATE.TRANSITION_DURATION} ease-out`,
  },

  [`& .${classes.dateText}`]: {
    fontSize: FLOATING_DATE.FONT_SIZE,
  },
}))

interface FloatingDateProps {
  title: string
  isVisible?: boolean
  className?: string
  style?: React.CSSProperties
  onVisibilityChange?: (isVisible: boolean) => void
}

export const FloatingDate: React.FC<FloatingDateProps> = ({
  title,
  isVisible = false,
  className,
  style,
  onVisibilityChange,
}) => {
  return (
    <StyledGrid container justifyContent='center' alignItems='center'>
      <Grid item xs />
      <Grid
        item
        className={classes.titleDiv}
        style={{
          opacity: isVisible ? 1 : 0,
          pointerEvents: isVisible ? 'auto' : 'none',
        }}
      >
        <Typography variant='body1' className={classes.dateText}>
          {title}
        </Typography>
      </Grid>
      <Grid item xs />
    </StyledGrid>
  )
}

export default FloatingDate
