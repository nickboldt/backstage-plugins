import React from 'react';
import Measure from 'react-measure';
import {
  Visualization,
  VisualizationProvider,
  TopologyView,
  VisualizationSurface,
  GRAPH_LAYOUT_END_EVENT,
  action,
  GRAPH_POSITION_CHANGE_EVENT,
  GraphModel,
  EdgeModel,
  defaultControlButtonsOptions,
  createTopologyControlButtons,
  TopologyControlBar,
  Controller,
  NodeModel,
  Node,
  Rect,
} from '@patternfly/react-topology';
import '@patternfly/react-styles/css/components/Topology/topology-components.css';
import { PipelineMixedNodeModel } from '../../types/pipeline-topology-types';
import pipelineComponentFactory, {
  layoutFactory,
} from './pipelineComponentFactory';
import { getLayoutData } from '../../utils/pipeline-topology-utils';
import {
  PipelineLayout as PipelineLayoutTypes,
  DROP_SHADOW_SPACING,
  NODE_HEIGHT,
  TOOLBAR_HEIGHT,
  GRAPH_MIN_WIDTH,
} from '../../consts/pipeline-topology-const';

type PipelineLayoutProps = {
  model: {
    graph: GraphModel;
    nodes: PipelineMixedNodeModel[];
    edges: EdgeModel[];
  };
};

export const PipelineLayout: React.FC<PipelineLayoutProps> = ({ model }) => {
  const [vis, setVis] = React.useState<Controller | null>(null);
  const [width, setWidth] = React.useState<number>(0);
  const [maxSize, setMaxSize] = React.useState<{
    height: number;
    width: number;
  }>({ height: 0, width: 0 });
  const storedGraphModel = React.useRef<GraphModel | null>(null);

  const layout: PipelineLayoutTypes = model.graph.layout as PipelineLayoutTypes;

  const onLayoutUpdate = React.useCallback(
    nodes => {
      const nodeBounds = nodes.map((node: Node<NodeModel, any>) =>
        node.getBounds(),
      );
      const maxWidth = Math.floor(
        nodeBounds
          .map((bounds: Rect) => bounds.width)
          .reduce((w1: number, w2: number) => Math.max(w1, w2), 0),
      );
      const maxHeight = Math.floor(
        nodeBounds
          .map((bounds: Rect) => bounds.height)
          .reduce((h1: number, h2: number) => Math.max(h1, h2), 0),
      );
      const maxObject = nodeBounds.find((nb: Rect) => nb.height === maxHeight);

      const maxX = Math.floor(
        nodeBounds
          .map((bounds: Rect) => bounds.x)
          .reduce((x1: number, x2: number) => Math.max(x1, x2), 0),
      );
      const maxY = Math.floor(
        nodeBounds
          .map((bounds: Rect) => bounds.y)
          .reduce((y1: number, y2: number) => Math.max(y1, y2), 0),
      );

      let horizontalMargin = 0;
      let verticalMargin = 0;
      if (layout) {
        horizontalMargin = getLayoutData(layout)?.marginx || 0;
        verticalMargin = getLayoutData(layout)?.marginy || 0;
      }
      const finallyTaskHeight =
        maxObject.y + maxHeight + DROP_SHADOW_SPACING + verticalMargin * 2;
      const regularTaskHeight =
        maxY + NODE_HEIGHT + DROP_SHADOW_SPACING + verticalMargin * 2;

      setMaxSize({
        height: Math.max(finallyTaskHeight, regularTaskHeight) + TOOLBAR_HEIGHT,
        width: Math.max(
          maxX + maxWidth + DROP_SHADOW_SPACING + horizontalMargin * 2,
          GRAPH_MIN_WIDTH,
        ),
      });
    },
    [setMaxSize, layout],
  );

  React.useEffect(() => {
    if (model.graph.id !== storedGraphModel?.current?.id) {
      storedGraphModel.current = null;
      setVis(null);
    }
  }, [vis, model]);

  React.useEffect(() => {
    let mounted = true;
    if (vis === null) {
      const controller = new Visualization();
      controller.registerLayoutFactory(layoutFactory);
      controller.registerComponentFactory(pipelineComponentFactory);
      controller.fromModel(model);
      controller.addEventListener(GRAPH_POSITION_CHANGE_EVENT, () => {
        storedGraphModel.current = controller.getGraph().toModel();
      });
      controller.addEventListener(GRAPH_LAYOUT_END_EVENT, () => {
        onLayoutUpdate(controller.getGraph().getNodes());
      });
      if (mounted) {
        setVis(controller);
      }
    } else {
      const graph = storedGraphModel.current;
      if (graph) {
        model.graph = graph;
      }
      vis.fromModel(model);
      vis.getGraph().layout();
    }
    return () => {
      mounted = false;
    };
  }, [vis, model, onLayoutUpdate]);

  React.useEffect(() => {
    if (model && vis) {
      const graph = storedGraphModel.current;
      if (graph) {
        model.graph = graph;
      }
      vis.fromModel(model);
    }
  }, [model, vis]);

  if (!vis) return null;

  const controlBar = (controller: Controller) => (
    <TopologyControlBar
      controlButtons={createTopologyControlButtons({
        ...defaultControlButtonsOptions,
        zoomInCallback: action(() => {
          controller.getGraph().scaleBy(4 / 3);
        }),
        zoomOutCallback: action(() => {
          controller.getGraph().scaleBy(0.75);
        }),
        fitToScreenCallback: action(() => {
          controller.getGraph().fit(80);
        }),
        resetViewCallback: action(() => {
          controller.getGraph().reset();
          controller.getGraph().layout();
        }),
        legend: false,
      })}
    />
  );

  return (
    <Measure
      bounds
      onResize={contentRect => {
        setWidth(contentRect.bounds?.width ?? 0);
      }}
    >
      {({ measureRef }) => (
        <div ref={measureRef}>
          <div
            style={{
              height: Math.min(window.innerHeight, maxSize?.height),
              width: Math.min(width, maxSize?.width),
            }}
          >
            <VisualizationProvider controller={vis}>
              <TopologyView controlBar={controlBar(vis)}>
                <VisualizationSurface />
              </TopologyView>
            </VisualizationProvider>
          </div>
        </div>
      )}
    </Measure>
  );
};
