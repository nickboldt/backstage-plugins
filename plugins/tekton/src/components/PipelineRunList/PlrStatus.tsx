import * as React from 'react';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  PendingIcon,
  SyncAltIcon,
} from '@patternfly/react-icons';
import { PipelineRunKind } from '../../types/pipelineRun';
import { pipelineRunFilterReducer } from '../../utils/pipeline-filter-reducer';

import './PlrStatus.css';

const getPlrStatusIcon = (plrStatus1: string) => {
  switch (plrStatus1) {
    case 'Succeeded':
      return <CheckCircleIcon className="bs-tkn-icons__green-check-icon" />;
    case 'Failed':
      return (
        <ExclamationCircleIcon className="bs-tkn-icons__red-exclamation-icon" />
      );
    case 'Running':
      return <SyncAltIcon />;
    case 'Cancelled':
      return (
        <ExclamationTriangleIcon className="bs-tkn-icons__yellow-exclamation-icon" />
      );
    case 'Pending':
      return <PendingIcon />;
    default:
      return null;
  }
};

const PlrStatus: React.FC<{ obj: PipelineRunKind }> = ({ obj }) => {
  const plrStatus = pipelineRunFilterReducer(obj);
  return (
    <>
      {getPlrStatusIcon(plrStatus)} {plrStatus}
    </>
  );
};

export default PlrStatus;
