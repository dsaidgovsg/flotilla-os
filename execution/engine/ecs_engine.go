package engine

import (
	"fmt"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/awserr"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/ecs"
	"github.com/stitchfix/flotilla-os/config"
	"github.com/stitchfix/flotilla-os/execution/adapters"
	"github.com/stitchfix/flotilla-os/state"
	"strings"
)

//
// ECSExecutionEngine submits runs to ecs
//
type ECSExecutionEngine struct {
	ecsClient ecsServiceClient
	adapter   adapters.ECSAdapter
}

type ecsServiceClient interface {
	RunTask(input *ecs.RunTaskInput) (*ecs.RunTaskOutput, error)
	StopTask(input *ecs.StopTaskInput) (*ecs.StopTaskOutput, error)
	DeregisterTaskDefinition(input *ecs.DeregisterTaskDefinitionInput) (*ecs.DeregisterTaskDefinitionOutput, error)
	RegisterTaskDefinition(input *ecs.RegisterTaskDefinitionInput) (*ecs.RegisterTaskDefinitionOutput, error)
	DescribeContainerInstances(input *ecs.DescribeContainerInstancesInput) (*ecs.DescribeContainerInstancesOutput, error)
}

//
// Initialize configures the ECSExecutionEngine and initializes internal clients
//
func (ee *ECSExecutionEngine) Initialize(conf config.Config) error {
	if !conf.IsSet("aws_default_region") {
		return fmt.Errorf("ECSExecutionEngine needs [aws_default_region] set in config")
	}

	flotillaMode := conf.GetString("flotilla_mode")
	if flotillaMode != "test" {
		sess := session.Must(session.NewSession(&aws.Config{
			Region: aws.String(conf.GetString("aws_default_region"))}))

		ee.ecsClient = ecs.New(sess)
	}

	adapter, err := adapters.NewECSAdapter(conf)
	if err != nil {
		return err
	}
	ee.adapter = adapter
	return nil
}

//
// Execute takes a pre-configured run and definition and submits them for execution
// to AWS ECS
//
func (ee *ECSExecutionEngine) Execute(definition state.Definition, run state.Run) (state.Run, bool, error) {
	var executed state.Run
	rti := ee.toRunTaskInput(definition, run)
	result, err := ee.ecsClient.RunTask(&rti)
	if err != nil {
		retryable := false
		if aerr, ok := err.(awserr.Error); ok {
			if aerr.Code() == ecs.ErrCodeInvalidParameterException {
				if strings.Contains(aerr.Message(), "no container instances") {
					retryable = true
				}
			}
		}
		return executed, retryable, err
	}
	if len(result.Failures) != 0 {
		msg := make([]string, len(result.Failures))
		for i, failure := range result.Failures {
			msg[i] = *failure.Reason
		}
		//
		// Retry these, they are very rare;
		// our upfront validation catches the obvious image and cluster resources
		//
		// IMPORTANT - log these messages
		//
		return executed, true, fmt.Errorf("ERRORS: %s", strings.Join(msg, "\n"))
	}

	return ee.translateTask(*result.Tasks[0]), false, nil
}

//
// Terminate takes a valid run and stops it
//
func (ee *ECSExecutionEngine) Terminate(run state.Run) error {
	_, err := ee.ecsClient.StopTask(&ecs.StopTaskInput{
		Cluster: &run.ClusterName,
		Task:    &run.TaskArn,
	})
	return err
}

//
// Define creates or updates a task definition with ecs
//
func (ee *ECSExecutionEngine) Define(definition state.Definition) (state.Definition, error) {
	var defined state.Definition
	rti := ee.adapter.AdaptDefinition(definition)
	result, err := ee.ecsClient.RegisterTaskDefinition(&rti)
	if err != nil {
		return defined, err
	}

	return ee.adapter.AdaptTaskDef(*result.TaskDefinition), nil
}

//
// Deregister deregisters the task definition from ecs
//
func (ee *ECSExecutionEngine) Deregister(definition state.Definition) error {
	_, err := ee.ecsClient.DeregisterTaskDefinition(&ecs.DeregisterTaskDefinitionInput{
		TaskDefinition: &definition.Arn,
	})
	return err
}

func (ee *ECSExecutionEngine) toRunTaskInput(definition state.Definition, run state.Run) ecs.RunTaskInput {
	return ee.adapter.AdaptRun(definition, run)
}

func (ee *ECSExecutionEngine) translateTask(task ecs.Task) state.Run {
	return ee.adapter.AdaptTask(task)
}