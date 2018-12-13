import * as React from "react"
import { Switch, Route } from "react-router-dom"
import { get, omit, isEqual } from "lodash"
import api from "../../api"
import config from "../../config"
import RunContext from "./RunContext"
import RunView from "./RunView"
import PopupContext from "../Popup/PopupContext"
import {
  IFlotillaRun,
  requestStates,
  ecsRunStatuses,
  intents,
  IPopupProps,
  IFlotillaRunContext,
} from "../../.."

interface IRunProps {
  renderPopup: (p: IPopupProps) => void
  rootPath: string
  runID: string
}

interface IRunState {
  inFlight: boolean
  error: any
  data: IFlotillaRun | null
  requestState: requestStates
}

class Run extends React.PureComponent<IRunProps, IRunState> {
  private requestInterval: number | undefined
  state = {
    inFlight: false,
    error: false,
    data: null,
    requestState: requestStates.NOT_READY,
  }

  componentDidMount() {
    this.requestData()

    this.requestInterval = window.setInterval(() => {
      this.requestData()
    }, +config.RUN_REQUEST_INTERVAL_MS)
  }

  componentDidUpdate(prevProps: IRunProps, prevState: IRunState) {
    if (!isEqual(prevProps.runID, this.props.runID)) {
      this.requestData()
    }

    if (
      get(prevState, ["data", "status"]) !== ecsRunStatuses.STOPPED &&
      get(this.state, ["data", "status"]) === ecsRunStatuses.STOPPED
    ) {
      this.clearInterval()
    }
  }

  componentWillUnmount() {
    this.clearInterval()
  }

  clearInterval = (): void => {
    window.clearInterval(this.requestInterval)
  }

  requestData = (): void => {
    // If the previous request is still in flight, return.
    if (this.state.inFlight === true) {
      return
    }

    this.setState({ inFlight: false, error: false })

    api
      .getRun({ runID: this.props.runID })
      .then(data => {
        this.setState({
          inFlight: false,
          data,
          error: false,
          requestState: requestStates.READY,
        })
      })
      .catch(error => {
        this.clearInterval()
        const e = error.getError()

        this.props.renderPopup({
          body: e.data,
          intent: intents.ERROR,
          shouldAutohide: false,
          title: `Error (${e.status})`,
        })

        this.setState({
          inFlight: false,
          error,
          requestState: requestStates.ERROR,
        })
      })
  }

  getCtx = (): IFlotillaRunContext => {
    const { runID } = this.props
    return {
      ...this.state,
      runID,
    }
  }

  render() {
    const { rootPath } = this.props

    return (
      <RunContext.Provider value={this.getCtx()}>
        <Switch>
          <Route exact path={rootPath} component={RunView} />
        </Switch>
      </RunContext.Provider>
    )
  }
}

export default class WrappedRun extends React.PureComponent<{}> {
  render() {
    return (
      <PopupContext.Consumer>
        {ctx => (
          <Run
            runID={get(this.props, ["match", "params", "runID"], "")}
            rootPath={get(this.props, ["match", "url"], "")}
            renderPopup={ctx.renderPopup}
          />
        )}
      </PopupContext.Consumer>
    )
  }
}