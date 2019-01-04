import * as React from "react"
import { withRouter, RouteComponentProps } from "react-router-dom"
import { Formik, FormikProps, Form, Field } from "formik"
import * as Yup from "yup"
import { get, omit, isEmpty, has } from "lodash"
import Navigation from "../Navigation/Navigation"
import Loader from "../styled/Loader"
import PopupContext from "../Popup/PopupContext"
import View from "../styled/View"
import StyledForm from "../styled/Form"
import TaskContext from "../Task/TaskContext"
import api from "../../api"
import config from "../../config"
import {
  IFlotillaCreateTaskPayload,
  IFlotillaEditTaskPayload,
  IFlotillaAPIError,
  IFlotillaTaskDefinition,
  flotillaUITaskFormTypes,
  flotillaUIIntents,
  IFlotillaUIPopupProps,
  flotillaUIRequestStates,
  IFlotillaUIBreadcrumb,
  IFlotillaUINavigationLink,
} from "../../.."
import { FormikFieldText } from "../Field/FieldText"
import { FormikFieldSelect } from "../Field/FieldSelect"
import FormikKVField from "../Field/FormikKVField"

const sharedYup = {
  command: Yup.string()
    .min(1, "")
    .required("Required"),
  memory: Yup.number()
    .min(1, "")
    .required("Required"),
  image: Yup.string()
    .min(1, "")
    .required("Required"),
  group_name: Yup.string()
    .min(1, "")
    .required("Required"),
  tags: Yup.array().of(
    Yup.string()
      .min(1, "")
      .required("Required")
  ),
  env: Yup.array().of(
    Yup.object().shape({
      name: Yup.string()
        .min(1, "")
        .required("Required"),
      value: Yup.string()
        .min(1, "")
        .required("Required"),
    })
  ),
}

const CreateTaskYupSchema = Yup.object().shape({
  alias: Yup.string()
    .min(1, "")
    .required("Required"),
  ...sharedYup,
})

const EditTaskYupSchema = Yup.object().shape(sharedYup)

interface ITaskFormProps extends RouteComponentProps<any> {
  type: flotillaUITaskFormTypes
  data?: IFlotillaTaskDefinition
  requestState?: flotillaUIRequestStates
  definitionID?: string
  requestData?: () => void
}

interface IUnwrappedTaskFormProps extends ITaskFormProps {
  push: (opt: any) => void
  renderPopup: (p: IFlotillaUIPopupProps) => void
  goBack: () => void
}

interface ITaskFormState {
  inFlight: boolean
  error: IFlotillaAPIError | undefined
}

class UnwrappedTaskForm extends React.PureComponent<
  IUnwrappedTaskFormProps,
  ITaskFormState
> {
  state = {
    inFlight: false,
    error: undefined,
  }

  getCreatePayload = (
    values: IFlotillaCreateTaskPayload
  ): IFlotillaCreateTaskPayload => {
    return {
      alias: get(values, "alias", ""),
      command: values.command,
      env: values.env,
      group_name: values.group_name,
      image: values.image,
      memory: +values.memory,
      tags: values.tags,
    }
  }

  getEditPayload = (
    values: IFlotillaCreateTaskPayload
  ): IFlotillaEditTaskPayload => {
    return {
      command: values.command,
      env: values.env,
      group_name: values.group_name,
      image: values.image,
      memory: +values.memory,
      tags: values.tags,
    }
  }

  handleSubmit = (values: IFlotillaCreateTaskPayload) => {
    const { data, type, push, requestData } = this.props

    this.setState({ inFlight: true })

    switch (type) {
      case flotillaUITaskFormTypes.EDIT:
        api
          .updateTask({
            definitionID: get(data, "definition_id", ""),
            values: this.getEditPayload(values),
          })
          .then(responseData => {
            this.setState({ inFlight: false })
            if (!!requestData) requestData()
            push(`/tasks/${get(responseData, "definition_id", "")}`)
          })
          .catch(error => {
            this.handleSubmitError(error)
          })
        break
      case flotillaUITaskFormTypes.CREATE:
      case flotillaUITaskFormTypes.COPY:
        api
          .createTask({ values: this.getCreatePayload(values) })
          .then(responseData => {
            this.setState({ inFlight: false })
            push(`/tasks/${get(responseData, "definition_id", "")}`)
          })
          .catch(error => {
            this.handleSubmitError(error)
          })
        break
      default:
        console.warn("TaskForm's `type` prop was not specified, doing nothing.")
    }
  }

  /**
   * Renders a popup with the error returned by the server.
   */
  handleSubmitError = (error: IFlotillaAPIError) => {
    this.setState({ inFlight: false })
    const { renderPopup } = this.props

    renderPopup({
      body: error.data,
      intent: flotillaUIIntents.ERROR,
      shouldAutohide: false,
      title: `An error occurred (Status Code: ${error.status})`,
    })
  }

  /**
   * Renders the form's title.
   */
  renderTitle() {
    switch (this.props.type) {
      case flotillaUITaskFormTypes.CREATE:
        return "Create New Task"
      case flotillaUITaskFormTypes.EDIT:
        return `Edit Task`
      case flotillaUITaskFormTypes.COPY:
        return `Copy Task`
      default:
        return "Task Form"
    }
  }

  /**
   * For the clone and update forms, the task definition is required to fill
   * out the default values of the form before it can be rendered.
   */
  shouldNotRenderForm = (): boolean => {
    const { type, requestState } = this.props

    if (
      type !== flotillaUITaskFormTypes.CREATE &&
      requestState === flotillaUIRequestStates.NOT_READY
    ) {
      return true
    }

    return false
  }

  /**
   * Returns the default values of the form.
   */
  getDefaultValues = (): IFlotillaCreateTaskPayload => {
    const { data } = this.props

    return {
      alias: "",
      memory: get(data, "memory", 1024),
      group_name: get(data, "group_name", ""),
      image: get(
        data,
        "image",
        `${get(config, "IMAGE_PREFIX", "")}IMAGE_NAME:IMAGE_TAG`
      ),
      command: get(data, "command", ""),
      env: get(data, "env", []),
      tags: get(data, "tags", []).filter(t => t.length > 0),
    }
  }

  /**
   * Returns a breadcrumbs array.
   */
  getBreadcrumbs = (): IFlotillaUIBreadcrumb[] => {
    const { type, data, definitionID } = this.props

    if (type === flotillaUITaskFormTypes.CREATE) {
      return [
        { text: "Tasks", href: "/tasks" },
        { text: "Create Task", href: "/tasks/create" },
      ]
    }

    const hrefSuffix = type === flotillaUITaskFormTypes.COPY ? "copy" : "edit"

    return [
      { text: "Tasks", href: "/tasks" },
      {
        text: data ? data.alias : "",
        href: `/tasks/${definitionID}`,
      },
      {
        text: this.renderTitle(),
        href: `/tasks/${definitionID}/${hrefSuffix}`,
      },
    ]
  }

  /**
   * Returns an action array for the view to render.
   */
  getActions = ({
    shouldDisableSubmitButton,
  }: {
    shouldDisableSubmitButton: boolean
  }): IFlotillaUINavigationLink[] => {
    const { inFlight } = this.state
    const { goBack } = this.props

    return [
      {
        isLink: false,
        text: "Cancel",
        buttonProps: {
          onClick: goBack,
        },
      },
      {
        isLink: false,
        text: "Submit",
        buttonProps: {
          type: "submit",
          intent: flotillaUIIntents.PRIMARY,
          isDisabled: shouldDisableSubmitButton === true,
          isLoading: !!inFlight,
        },
      },
    ]
  }

  render() {
    const { type } = this.props

    // Don't render the form if, say, the task definition for updating a task
    // has not been fetched. Wait until the next render call.
    if (this.shouldNotRenderForm()) {
      return <Loader />
    }

    return (
      <Formik
        initialValues={this.getDefaultValues()}
        onSubmit={this.handleSubmit}
        validationSchema={
          type === flotillaUITaskFormTypes.EDIT
            ? EditTaskYupSchema
            : CreateTaskYupSchema
        }
      >
        {(formikProps: FormikProps<IFlotillaCreateTaskPayload>) => (
          <Form>
            <View>
              <Navigation
                breadcrumbs={this.getBreadcrumbs()}
                actions={this.getActions({
                  shouldDisableSubmitButton: formikProps.isValid !== true,
                })}
              />
              <StyledForm title={this.renderTitle()}>
                {type !== flotillaUITaskFormTypes.EDIT && (
                  <Field
                    name="alias"
                    value={formikProps.values.alias}
                    onChange={formikProps.handleChange}
                    component={FormikFieldText}
                    label="Alias"
                    description="Choose a descriptive alias for this task."
                    isRequired
                  />
                )}
                <Field
                  name="group_name"
                  value={formikProps.values.group_name}
                  onChange={formikProps.handleChange}
                  component={FormikFieldSelect}
                  label="Group Name"
                  description="Create a new group name or select an existing one to help searching for this task in the future."
                  requestOptionsFn={api.getGroups}
                  shouldRequestOptions
                  isCreatable
                  isRequired
                />
                <Field
                  name="image"
                  value={formikProps.values.image}
                  onChange={formikProps.handleChange}
                  component={FormikFieldText}
                  label="Image"
                  description="The full URL of the Docker image and tag."
                  isRequired
                />
                <Field
                  name="command"
                  value={formikProps.values.command}
                  onChange={formikProps.handleChange}
                  component={FormikFieldText}
                  label="Command"
                  description="The command for this task to execute."
                  isRequired
                  isTextArea
                />
                <Field
                  name="memory"
                  value={formikProps.values.memory}
                  onChange={formikProps.handleChange}
                  component={FormikFieldText}
                  isNumber
                  label="Memory (MB)"
                  description="The amount of memory this task needs."
                  isRequired
                />
                <Field
                  name="tags"
                  value={formikProps.values.tags}
                  onChange={formikProps.handleChange}
                  component={FormikFieldSelect}
                  label="Tags"
                  description=""
                  requestOptionsFn={api.getTags}
                  shouldRequestOptions
                  isCreatable
                  isMulti
                  isRequired={false}
                />
                <FormikKVField
                  name="env"
                  value={formikProps.values.env}
                  description="Environment variables that can be adjusted during execution."
                  isKeyRequired
                  isValueRequired={false}
                  label="Environment Variables"
                  setFieldValue={formikProps.setFieldValue}
                />
              </StyledForm>
            </View>
          </Form>
        )}
      </Formik>
    )
  }
}

const ConnectedTaskForm = withRouter(props => (
  <PopupContext.Consumer>
    {ctx => (
      <UnwrappedTaskForm
        {...omit(props, ["history", "location", "match", "staticContext"])}
        push={props.history.push}
        goBack={props.history.goBack}
        renderPopup={ctx.renderPopup}
        type={get(props, "type", "")}
      />
    )}
  </PopupContext.Consumer>
)) as React.ComponentType<any>

export const CreateTaskForm: React.SFC<{}> = () => (
  <ConnectedTaskForm type={flotillaUITaskFormTypes.CREATE} />
)

export const UpdateTaskForm: React.SFC<{}> = () => (
  <TaskContext.Consumer>
    {ctx => <ConnectedTaskForm type={flotillaUITaskFormTypes.EDIT} {...ctx} />}
  </TaskContext.Consumer>
)

export const CloneTaskForm: React.SFC<{}> = () => (
  <TaskContext.Consumer>
    {ctx => <ConnectedTaskForm type={flotillaUITaskFormTypes.COPY} {...ctx} />}
  </TaskContext.Consumer>
)
