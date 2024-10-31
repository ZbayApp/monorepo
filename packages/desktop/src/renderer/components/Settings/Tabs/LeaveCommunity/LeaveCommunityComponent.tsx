import React, { FC } from 'react'

import { styled } from '@mui/material/styles'

import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'

const PREFIX = 'LeaveCommunity'

const classes = {
  root: `${PREFIX}root`,
  titleContainer: `${PREFIX}titleContainer`,
  descContainer: `${PREFIX}descContainer`,
  iconContainer: `${PREFIX}iconContainer`,
  buttonContainer: `${PREFIX}buttonContainer`,
  button: `${PREFIX}button`,
  secondaryButtonContainer: `${PREFIX}secondaryButtonContainer`,
  secondaryButton: `${PREFIX}secondaryButton`,
}

const StyledGrid = styled(Grid)(({ theme }) => ({
  [`& .${classes.root}`]: {},

  [`& .${classes.titleContainer}`]: {
    marginTop: 16,
  },

  [`& .${classes.descContainer}`]: {
    marginTop: 16,
    width: '100%',
    maxWidth: 600,
  },

  [`& .${classes.iconContainer}`]: {
    marginTop: 0,
  },

  [`& .${classes.buttonContainer}`]: {
    marginTop: 8,
  },

  [`& .${classes.button}`]: {
    width: 190,
    height: 60,
    color: theme.palette.colors.white,
    backgroundColor: theme.palette.colors.purple,
    padding: theme.spacing(2),
    '&:hover': {
      backgroundColor: theme.palette.colors.darkPurple,
    },
    '&:disabled': {
      backgroundColor: theme.palette.colors.gray,
    },
  },

  [`& .${classes.secondaryButtonContainer}`]: {
    marginTop: 16,
    marginBottom: 1,
  },

  [`& .${classes.secondaryButton}`]: {
    width: 160,
    height: 40,
    color: theme.palette.colors.darkGray,
    backgroundColor: theme.palette.colors.white,
    padding: theme.spacing(2),
    '&:hover': {
      boxShadow: 'none',
      cursor: 'pointer',
      backgroundColor: theme.palette.colors.white,
    },
  },
}))

export interface LeaveCommunityProps {
  communityName: string
  leaveCommunity: () => void
  open: boolean
  handleClose: () => void
}

export const LeaveCommunityComponent: FC<LeaveCommunityProps> = ({ leaveCommunity, handleClose }) => {
  return (
    <StyledGrid container justifyContent='center'>
      <Grid container item className={classes.titleContainer} xs={12} direction='row' justifyContent='center'>
        <Typography variant={'h3'}>Leave community?</Typography>
      </Grid>
      <Grid container item className={classes.descContainer} xs={12} direction='row' justifyContent='center'>
        <Typography align={'center'} variant='body2'>
          You will no longer have access to this community. This can't be undone.
        </Typography>
      </Grid>
      <Grid container item className={classes.secondaryButtonContainer} xs={12} direction='row' justifyContent='center'>
        <Button variant='contained' onClick={handleClose} size='small' className={classes.button}>
          Go back
        </Button>
      </Grid>
      <Grid item xs={'auto'} className={classes.buttonContainer}>
        <Button
          variant='contained'
          onClick={leaveCommunity}
          size='small'
          fullWidth
          className={classes.secondaryButton}
          data-testid={'leave-community-button'}
        >
          Leave community
        </Button>
      </Grid>
    </StyledGrid>
  )
}

export default LeaveCommunityComponent
