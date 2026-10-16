import test from 'node:test';
import assert from 'node:assert/strict';
import {geoCloudHome} from '../lib/cloud-entry.js';

const application={appId:'geo',tenantId:'tenant-a',baseUrl:'https://geo.fsstory.net',capabilities:['geo.read']};
const snapshot={phase:'ready',activeTenantId:'tenant-a',applications:[application]};
test('GEO cloud entry requires the current subject grant and an exact approved origin',()=>{
  assert.equal(geoCloudHome(snapshot),'https://geo.fsstory.net/');
  for(const patch of [{phase:'expired'},{activeTenantId:'tenant-b'},{applications:[]},
    {applications:[{...application,baseUrl:'https://geo.fsstory.net.evil.test'}]},
    {applications:[{...application,baseUrl:'https://geo.fsstory.net/?token=secret'}]},
    {applications:[{...application,capabilities:[]}]},
    {applications:[{...application,baseUrl:'http://geo.fsstory.net'}]}])assert.equal(geoCloudHome({...snapshot,...patch}),null);
});
