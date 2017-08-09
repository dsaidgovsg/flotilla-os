package testutils

import (
	"fmt"
	"github.com/stitchfix/flotilla-os/config"
	"github.com/stitchfix/flotilla-os/queue"
	"github.com/stitchfix/flotilla-os/state"
	"testing"
)

//
// ImplementsAllTheThings defines a struct which implements many of the interfaces
// to facilitate easier testing
//
type ImplementsAllTheThings struct {
	T                       *testing.T
	Calls                   []string                    // Collects calls
	Definitions             map[string]state.Definition // Definitions stored in "state"
	Runs                    map[string]state.Run        // Runs stored in "state"
	Qurls                   map[string]string           // Urls returned by Queue Manager
	Defined                 []string                    // List of defined definitions (Execution Engine)
	Queued                  []string                    // List of queued runs (Queue Manager)
	ExecuteError            error                       // Execution Engine - error to return
	ExecuteErrorIsRetryable bool                        // Execution Engine - is the run retryable?
	Groups                  []string
	Tags                    []string
}

// Name - general
func (iatt *ImplementsAllTheThings) Name() string {
	iatt.Calls = append(iatt.Calls, "Name")
	return "implementer"
}

// Initialize - general
func (iatt *ImplementsAllTheThings) Initialize(conf config.Config) error {
	iatt.Calls = append(iatt.Calls, "Initialize")
	return nil
}

// Cleanup - general
func (iatt *ImplementsAllTheThings) Cleanup() error {
	iatt.Calls = append(iatt.Calls, "Cleanup")
	return nil
}

// ListDefinitions - StateManager
func (iatt *ImplementsAllTheThings) ListDefinitions(
	limit int, offset int, sortBy string,
	order string, filters map[string]string,
	envFilters map[string]string) (state.DefinitionList, error) {
	iatt.Calls = append(iatt.Calls, "ListDefinitions")
	dl := state.DefinitionList{Total: len(iatt.Definitions)}
	for _, d := range iatt.Definitions {
		dl.Definitions = append(dl.Definitions, d)
	}
	return dl, nil
}

// GetDefinition - StateManager
func (iatt *ImplementsAllTheThings) GetDefinition(definitionID string) (state.Definition, error) {
	iatt.Calls = append(iatt.Calls, "GetDefinition")
	var err error
	d, ok := iatt.Definitions[definitionID]
	if !ok {
		err = fmt.Errorf("No definition %s", definitionID)
	}
	return d, err
}

// UpdateDefinition - StateManager
func (iatt *ImplementsAllTheThings) UpdateDefinition(definitionID string, updates state.Definition) (state.Definition, error) {
	iatt.Calls = append(iatt.Calls, "UpdateDefinition")
	defn := iatt.Definitions[definitionID]
	defn.UpdateWith(updates)
	iatt.Definitions[definitionID] = defn
	return defn, nil
}

// CreateDefinition - StateManager
func (iatt *ImplementsAllTheThings) CreateDefinition(d state.Definition) error {
	iatt.Calls = append(iatt.Calls, "CreateDefinition")
	iatt.Definitions[d.DefinitionID] = d
	return nil
}

// DeleteDefinition - StateManager
func (iatt *ImplementsAllTheThings) DeleteDefinition(definitionID string) error {
	iatt.Calls = append(iatt.Calls, "DeleteDefinition")
	delete(iatt.Definitions, definitionID)
	return nil
}

// ListRuns - StateManager
func (iatt *ImplementsAllTheThings) ListRuns(limit int, offset int, sortBy string,
	order string, filters map[string]string,
	envFilters map[string]string) (state.RunList, error) {
	iatt.Calls = append(iatt.Calls, "ListRuns")
	rl := state.RunList{Total: len(iatt.Runs)}
	for _, r := range iatt.Runs {
		rl.Runs = append(rl.Runs, r)
	}
	return rl, nil
}

// GetRun - StateManager
func (iatt *ImplementsAllTheThings) GetRun(runID string) (state.Run, error) {
	iatt.Calls = append(iatt.Calls, "GetRun")
	var err error
	r, ok := iatt.Runs[runID]
	if !ok {
		err = fmt.Errorf("No run %s", runID)
	}
	return r, err
}

// CreateRun - StateManager
func (iatt *ImplementsAllTheThings) CreateRun(r state.Run) error {
	iatt.Calls = append(iatt.Calls, "CreateRun")
	iatt.Runs[r.RunID] = r
	return nil
}

// UpdateRun - StateManager
func (iatt *ImplementsAllTheThings) UpdateRun(runID string, updates state.Run) (state.Run, error) {
	iatt.Calls = append(iatt.Calls, "UpdateRun")
	run := iatt.Runs[runID]
	run.UpdateWith(updates)
	iatt.Runs[runID] = run
	return run, nil
}

// ListGroups - StateManager
func (iatt *ImplementsAllTheThings) ListGroups(limit int, offset int, name *string) (state.GroupsList, error) {
	iatt.Calls = append(iatt.Calls, "ListGroups")
	return state.GroupsList{Total: len(iatt.Groups), Groups: iatt.Groups}, nil
}

// ListTags - StateManager
func (iatt *ImplementsAllTheThings) ListTags(limit int, offset int, name *string) (state.TagsList, error) {
	iatt.Calls = append(iatt.Calls, "ListTags")
	return state.TagsList{Total: len(iatt.Tags), Tags: iatt.Tags}, nil
}

// QurlFor - QueueManager
func (iatt *ImplementsAllTheThings) QurlFor(name string) (string, error) {
	iatt.Calls = append(iatt.Calls, "QurlFor")
	qurl, _ := iatt.Qurls[name]
	return qurl, nil
}

// Enqueue - QueueManager
func (iatt *ImplementsAllTheThings) Enqueue(qURL string, run state.Run) error {
	iatt.Calls = append(iatt.Calls, "Enqueue")
	iatt.Queued = append(iatt.Queued, run.RunID)
	return nil
}

// Receive - QueueManager
func (iatt *ImplementsAllTheThings) Receive(qURL string) (queue.RunReceipt, error) {
	iatt.Calls = append(iatt.Calls, "Receive")
	if len(iatt.Queued) == 0 {
		return queue.RunReceipt{}, nil
	}

	popped := iatt.Queued[0]
	iatt.Queued = iatt.Queued[1:]
	receipt := queue.RunReceipt{
		Run: &state.Run{RunID: popped},
	}
	receipt.Done = func() error {
		iatt.Calls = append(iatt.Calls, "RunReceipt.Done")
		return nil
	}
	return receipt, nil
}

// List - QueueManager
func (iatt *ImplementsAllTheThings) List() ([]string, error) {
	iatt.Calls = append(iatt.Calls, "List")
	res := make([]string, len(iatt.Qurls))
	i := 0
	for _, qurl := range iatt.Qurls {
		res[i] = qurl
		i++
	}
	return res, nil
}

// CanBeRun - Cluster Client
func (iatt *ImplementsAllTheThings) CanBeRun(clusterName string, definition state.Definition) (bool, error) {
	iatt.Calls = append(iatt.Calls, "CanBeRun")
	if clusterName == "invalidcluster" {
		return false, nil
	}
	return true, nil
}

// IsImageValid - Registry Client
func (iatt *ImplementsAllTheThings) IsImageValid(imageRef string) (bool, error) {
	iatt.Calls = append(iatt.Calls, "IsImageValid")
	if imageRef == "invalidimage" {
		return false, nil
	}
	return true, nil
}

// Execute - Execution Engine
func (iatt *ImplementsAllTheThings) Execute(definition state.Definition, run state.Run) (state.Run, bool, error) {
	iatt.Calls = append(iatt.Calls, "Execute")
	return state.Run{}, iatt.ExecuteErrorIsRetryable, iatt.ExecuteError
}

// Terminate - Execution Engine
func (iatt *ImplementsAllTheThings) Terminate(run state.Run) error {
	iatt.Calls = append(iatt.Calls, "Terminate")
	return nil
}

// Define - Execution Engine
func (iatt *ImplementsAllTheThings) Define(definition state.Definition) (state.Definition, error) {
	iatt.Calls = append(iatt.Calls, "Define")
	iatt.Defined = append(iatt.Defined, definition.DefinitionID)
	return definition, nil
}

// Deregister - Execution Engine
func (iatt *ImplementsAllTheThings) Deregister(definition state.Definition) error {
	iatt.Calls = append(iatt.Calls, "Deregister")
	return nil
}

// Logs - Logs Client
func (iatt *ImplementsAllTheThings) Logs(definition state.Definition, run state.Run, lastSeen *string) (string, *string, error) {
	iatt.Calls = append(iatt.Calls, "Logs")
	return "", nil, nil
}