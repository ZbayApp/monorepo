import { Typography, styled } from '@mui/material'
import classNames from 'classnames'
import React, { ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { isAllEmoji } from '../../../../../../common/src/emojis'

const PREFIX = 'TextMessage'

const classes = {
  message: `${PREFIX}message`,
  emojiMessage: `${PREFIX}emojiMessage`,
  pending: `${PREFIX}pending`,
  blockquote: `${PREFIX}blockquote`,
  code: `${PREFIX}code`,
  pre: `${PREFIX}pre`,
  hr: `${PREFIX}hr`,
  link: `${PREFIX}link`,
  ol: `${PREFIX}list`,
  ul: `${PREFIX}ul`,
  table: `${PREFIX}table`,
  tableHeaderCell: `${PREFIX}tableHeaderCell`,
  tableRowCell: `${PREFIX}tableRowCell`,
}

const StyledTypography = styled(Typography)(({ theme }) => ({
  [`&.${classes.message}`]: {
    fontSize: '0.855rem',
    whiteSpace: 'pre-line',
    lineHeight: '21px',
    overflowWrap: 'anywhere',
  },
  [`&.${classes.emojiMessage}`]: {
    fontSize: '1.7rem', // Double the normal fontSize
    lineHeight: '42px', // Double the normal lineHeight
  },
  [`&.${classes.pending}`]: {
    color: theme.palette.colors.lightGray,
  },

  [`& .${classes.blockquote}`]: {
    lineHeight: '1em',
    whiteSpace: 'normal',
    marginInlineStart: 0,
    marginBlockStart: '.5em',
    marginBlockEnd: '.5em',
    paddingTop: '.5em',
    paddingBottom: '.5em',
    paddingLeft: '1em',
    borderLeft: 'solid',
    borderLeftWidth: '3px',
    borderColor: theme.palette.colors.lightGray,
    color: theme.palette.colors.lightGray,
  },

  [`& .${classes.code}`]: {
    backgroundColor: theme.palette.background.paper,
    padding: '.25em',
  },

  [`& .${classes.pre}`]: {
    backgroundColor: theme.palette.background.paper,
    padding: '.25em',
  },

  [`& .${classes.hr}`]: {
    marginTop: '2em',
  },

  [`& .${classes.link}`]: {
    color: theme.palette.colors.linkBlue,
    cursor: 'pointer',
    textDecoration: 'none',
    '&:hover': {
      textDecoration: 'underline',
    },
  },

  [`& .${classes.ol}`]: {
    paddingInlineStart: '15px',
    whiteSpace: 'normal',
  },

  [`& .${classes.ul}`]: {
    paddingInlineStart: '15px',
    whiteSpace: 'normal',
    listStyleType: 'disc',
  },

  [`& .${classes.table}`]: {
    width: '100%',
  },

  [`& .${classes.tableHeaderCell}`]: {
    borderBottom: 'solid',
    borderBottomWidth: 1,
    borderColor: theme.palette.colors.border01,
    textAlign: 'center',
  },

  [`& .${classes.tableRowCell}`]: {
    textAlign: 'center',
  },
})) as typeof Typography

export interface TextMessageComponentProps {
  message: string
  messageId: string
  pending: boolean
  openUrl: (url: string) => void
}

export const TextMessageComponent: React.FC<TextMessageComponentProps> = ({ message, messageId, pending, openUrl }) => {
  const componentDecorator = (decoratedHref: string, decoratedText: string, key: number): ReactNode => {
    return (
      <a
        onClick={() => {
          openUrl(decoratedHref)
        }}
        className={classNames({ [classes.link]: true })}
        key={key}
      >
        {decoratedText}
      </a>
    )
  }

  return (
    <StyledTypography
      component={'span' as any}
      className={classNames({
        [classes.message]: true,
        [classes.pending]: pending,
        [classes.emojiMessage]: isAllEmoji(message),
      })}
      data-testid={`messagesGroupContent-${messageId}`}
    >
      <ReactMarkdown
        remarkPlugins={[[remarkGfm, { singleTilde: false }]]}
        children={message}
        components={{
          a: ({ node, ...props }) => (
            <a
              onClick={e => {
                e.preventDefault()
                if (props.href) openUrl(props.href)
              }}
              className={classNames({ [classes.link]: true })}
              {...props}
            />
          ),
          // Not working in older ReactMarkdown version we use because of ESM
          // blockquote: ({ node, ...props }) => (
          //   <blockquote className={classNames({ [classes.blockquote]: true })} {...props} />
          // ),
          code: ({ node, ...props }) => <code className={classNames({ [classes.code]: true })} {...props} />,
          pre: ({ node, ...props }) => <pre className={classNames({ [classes.pre]: true })} {...props} />,
          hr: ({ node, ...props }) => <hr className={classNames({ [classes.hr]: true })} {...props} />,
          img: ({ node, ...props }) => (
            <p>
              ![{props.alt}](
              <a
                onClick={e => {
                  e.preventDefault()
                  if (props.src) openUrl(props.src)
                }}
                className={classNames({ [classes.link]: true })}
                href={props.src}
              >
                {props.src}
              </a>
              )
            </p>
          ),
          p: React.Fragment,
          ol: ({ node, ...props }) => <ol className={classNames({ [classes.ol]: true })} {...props} />,
          ul: ({ node, ...props }) => <ul className={classNames({ [classes.ul]: true })} {...props} />,
          table: ({ node, ...props }) => <table className={classNames({ [classes.table]: true })} {...props} />,
          // Not working in older ReactMarkdown version we use because of ESM
          // th: ({ node, ...props }) => (
          //   <th className={classNames({ [classes.tableHeaderCell]: props.isHeader })} {...props} />
          // ),
          // td: ({ node, ...props }) => (
          //   <td className={classNames({ [classes.tableRowCell]: true })} {...props} />
          // )
        }}
      />
    </StyledTypography>
  )
}
