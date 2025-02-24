import {
  hubApiClient,
  getManagedCluster,
  listManagedClusters,
  getManagedClusterInfo,
} from './kubernetes';
import { createLogger } from 'winston';
import transports from 'winston/lib/winston/transports';
import { CustomObjectsApi, KubeConfig } from '@kubernetes/client-node';
import { OcmConfig } from '../types';
import { setupServer } from 'msw/node';
import { handlers } from '../../__fixtures__/handlers';

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.restoreHandlers());
afterAll(() => server.close());

const FIXTURES_DIR = `${__dirname}/../../__fixtures__`;
const logger = createLogger({
  transports: [new transports.Console({ silent: true })],
});

describe('hubApiClient', () => {
  it('should use the default config if there is no service account token configured', () => {
    process.env.KUBECONFIG = `${FIXTURES_DIR}/kubeconfig.yaml`;
    const clusterConfig = {
      id: 'foo',
      hubResourceName: 'cluster1',
    } as OcmConfig;

    const result = hubApiClient(clusterConfig, logger);

    expect(result.basePath).toBe('http://example.com');
    // These fields aren't on the type but are there
    const auth = (result as any).authentications.default;
    expect(auth.clusters[0].name).toBe('default-cluster');
    expect(auth.users[0].token).toBeUndefined();
  });

  it('should use the provided config in the returned api client', () => {
    const clusterConfig = {
      id: 'foo',
      hubResourceName: 'cluster1',
      serviceAccountToken: 'TOKEN',
      url: 'http://cluster.com',
    } as OcmConfig;

    const result = hubApiClient(clusterConfig, logger);

    expect(result.basePath).toBe('http://cluster.com');
    // These fields aren't on the type but are there
    const auth = (result as any).authentications.default;
    expect(auth.clusters[0].name).toBe('cluster1');
    expect(auth.users[0].token).toBe('TOKEN');
  });
});

const kubeConfig = {
  clusters: [{ name: 'cluster', server: 'http://localhost:5000' }],
  users: [{ name: 'user', password: 'password' }],
  contexts: [{ name: 'currentContext', cluster: 'cluster', user: 'user' }],
  currentContext: 'currentContext',
};

const getApi = () => {
  const kc = new KubeConfig();
  kc.loadFromOptions(kubeConfig);
  return kc.makeApiClient(CustomObjectsApi);
};

describe('getManagedClusters', () => {
  it('should return some clusters', async () => {
    const result: any = await listManagedClusters(getApi());
    expect(result.items[0].metadata.name).toBe('local-cluster');
    expect(result.items[1].metadata.name).toBe('cluster1');
  });
});

describe('getManagedCluster', () => {
  it('should return the correct cluster', async () => {
    const result: any = await getManagedCluster(getApi(), 'cluster1');

    expect(result.metadata.name).toBe('cluster1');
  });

  it('should return an error object when cluster is not found', async () => {
    const result = await getManagedCluster(
      getApi(),
      'non_existent_cluster',
    ).catch(r => r);

    expect(result.statusCode).toBe(404);
    expect(result.name).toBe('NotFound');
  });
});

describe('getManagedClusterInfo', () => {
  it('should return cluster', async () => {
    const result: any = await getManagedClusterInfo(getApi(), 'local-cluster');
    expect(result.metadata.name).toBe('local-cluster');
  });
});
