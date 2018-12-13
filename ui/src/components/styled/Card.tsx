import * as React from "react"
import styled from "styled-components"
import colors from "../../helpers/colors"
import { DEFAULT_BORDER, SPACING_PX } from "../../helpers/styles"
import ButtonGroup from "./ButtonGroup"

const CARD_HEADER_FOOTER_HEIGHT_PX = 48
const CARD_BORDER_RADIUS_PX = 8

const CardContainer = styled.div`
  background: ${colors.black[0]};
  border: ${DEFAULT_BORDER};
  width: 100%;
  border-radius: ${CARD_BORDER_RADIUS_PX}px;
`

const CardHeader = styled.div`
  border-bottom: ${DEFAULT_BORDER};
  border-top-left-radius: ${CARD_BORDER_RADIUS_PX}px;
  border-top-right-radius: ${CARD_BORDER_RADIUS_PX}px;
  background: inherit;
  min-height: ${CARD_HEADER_FOOTER_HEIGHT_PX}px;
  width: 100%;
  padding: ${SPACING_PX}px;
  display: flex;
  flex-flow: row nowrap;
  justify-content: space-between;
  align-items: center;
`

const CardContent = styled.div`
  padding: ${SPACING_PX}px;
  word-break: break-all;
`

const CardFooter = styled.div`
  border-top: ${DEFAULT_BORDER};
  border-bottom-left-radius: ${CARD_BORDER_RADIUS_PX}px;
  border-bottom-right-radius: ${CARD_BORDER_RADIUS_PX}px;
  background: inherit;
  min-height: ${CARD_HEADER_FOOTER_HEIGHT_PX}px;
  width: 100%;
  padding: ${SPACING_PX}px;
`

interface ICardProps {
  actions?: React.ReactNode
  footerActions?: React.ReactNode
  title?: React.ReactNode
}

class Card extends React.PureComponent<ICardProps> {
  static displayName = "Card"
  render() {
    const { title, actions, footerActions, children } = this.props
    const shouldRenderHeader = !!title || !!actions
    const shouldRenderFooter = !!footerActions

    return (
      <CardContainer>
        {shouldRenderHeader && (
          <CardHeader>
            <div>{title}</div>
            <ButtonGroup>{actions}</ButtonGroup>
          </CardHeader>
        )}
        <CardContent>{children}</CardContent>
        {shouldRenderFooter && (
          <CardFooter>
            <ButtonGroup>{footerActions}</ButtonGroup>
          </CardFooter>
        )}
      </CardContainer>
    )
  }
}

export default Card