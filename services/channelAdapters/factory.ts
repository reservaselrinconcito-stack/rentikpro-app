
import { ChannelConnection } from '../../types';
import { IChannelAdapter } from './types';
import { ICalAdapter } from './icalAdapter';
import { FutureApiAdapter } from './futureApiAdapter';

const icalAdapter = new ICalAdapter();
const apiAdapter = new FutureApiAdapter();

export const getAdapter = (connection: ChannelConnection): IChannelAdapter => {
  if (connection.connection_type === 'API') {
    return apiAdapter;
  }
  // Default to iCal for everything else
  return icalAdapter;
};
