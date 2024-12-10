import React, { FC } from 'react'
import { styled } from '@mui/material/styles'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

const app = require('@electron/remote').app

const PREFIX = 'About'

const classes = {
  title: `${PREFIX}title`,
  titleDiv: `${PREFIX}titleDiv`,
}

const StyledGrid = styled(Grid)(() => ({
  [`& .${classes.title}`]: {},

  [`& .${classes.titleDiv}`]: {
    marginBottom: 24,
  },
}))

export const About: FC = () => {
  const version = app.getVersion()
  return (
    <StyledGrid container direction='column'>
      <Grid container item justifyContent='space-between' alignItems='center' className={classes.titleDiv}>
        <Grid item className={classes.title}>
          <Typography variant='h3'>About Quiet</Typography>
        </Grid>
      </Grid>
      <Grid item>
        <Grid item>
          <Typography variant='body2'>
            Version: {version}
            <br />
            Copyright © {new Date().getFullYear()} Quiet LLC and other contributors
          </Typography>
        </Grid>
      </Grid>
    </StyledGrid>
  )
}
