import React from 'react'

import { styled } from '@mui/material/styles'

import { Grid, Typography } from '@mui/material'

const PREFIX = 'MessagesDivider'

const classes = {
  root: `${PREFIX}root`,
  divider: `${PREFIX}divider`,
  titleDiv: `${PREFIX}titleDiv`,
  dateText: `${PREFIX}dateText`,
}

const StyledGrid = styled(Grid)(({ theme }) => ({
  marginTop: '5px',

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
    gap: '8px',
    width: '108px',
    height: '25px',
    backgroundColor: theme.palette.background.default,
    border: `1px solid ${theme.palette.colors.border01}`,
    borderRadius: '72px',
  },

  [`& .${classes.dateText}`]: {
    fontSize: '13px',
  },
}))

interface MessagesDividerProps {
  title: string
}

export const MessagesDivider: React.FC<MessagesDividerProps> = ({ title }) => {
  return (
    <StyledGrid container justifyContent='center' alignItems='center'>
      <Grid item xs>
        <div className={classes.divider} />
      </Grid>
      <Grid item className={classes.titleDiv}>
        <Typography variant='body1' className={classes.dateText}>
          {title}
        </Typography>
      </Grid>
      <Grid item xs>
        <div className={classes.divider} />
      </Grid>
    </StyledGrid>
  )
}

export default MessagesDivider
