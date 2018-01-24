import React from "react"
import { intentTypes, Popup, popupActions } from "aa-ui-components"
import axios from "axios"
import { has } from "lodash"
import config from "../config"
import { actionTypes } from "../constants/"

const strToSelectOpt = opt => ({ label: opt, value: opt })

const requestDropdownOpts = () => ({ type: actionTypes.REQUEST_SELECT_OPTS })

const mapStringArrayToSelectObjectArray = (obj, key) => {
  if (has(obj, key) && Array.isArray(obj[key])) {
    return obj[key].map(strToSelectOpt)
  }
  return []
}
const receiveDropdownOpts = res => {
  return {
    type: actionTypes.RECEIVE_SELECT_OPTS,
    payload: {
      group: mapStringArrayToSelectObjectArray(res[0], "groups"),
      cluster: mapStringArrayToSelectObjectArray(res[1], "clusters"),
      tag: mapStringArrayToSelectObjectArray(res[2], "tags"),
    },
  }
}

const receiveDropdownOptsError = error => dispatch => {
  dispatch(
    popupActions.renderPopup(
      <Popup
        title="Error fetching select options!"
        message={error.toString()}
        intent={intentTypes.error}
        hide={() => {
          dispatch(popupActions.unrenderPopup())
        }}
        autohide={false}
      />
    )
  )
}

export default function fetchDropdownOpts() {
  return dispatch => {
    dispatch(requestDropdownOpts())

    axios
      .all([
        axios.get(`${config.FLOTILLA_API}/groups?limit=2000`),
        axios.get(`${config.FLOTILLA_API}/clusters`),
        axios.get(`${config.FLOTILLA_API}/tags?limit=5000`),
      ])
      .then(
        axios.spread((group, cluster, tag) => {
          dispatch(receiveDropdownOpts([group.data, cluster.data, tag.data]))
        })
      )
      .catch(err => {
        dispatch(receiveDropdownOptsError(err))
      })
  }
}
