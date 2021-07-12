/**
 * Copyright (c) 2021 OpenLens Authors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import React from "react";
import { observer } from "mobx-react";
import { TabLayout, TabLayoutRoute } from "../layout/tab-layout";
import { HelmCharts } from "../+apps-helm-charts";
import { HelmReleases } from "../+apps-releases";
import { helmChartsURL, helmChartsRoute, releaseURL, releaseRoute } from "../../../common/routes";

@observer
export class Apps extends React.Component {
  static get tabRoutes(): TabLayoutRoute[] {

    return [
      {
        title: "Charts",
        component: HelmCharts,
        url: helmChartsURL(),
        routePath: helmChartsRoute.path.toString(),
      },
      {
        title: "Releases",
        component: HelmReleases,
        url: releaseURL(),
        routePath: releaseRoute.path.toString(),
      },
    ];
  }

  render() {
    return (
      <TabLayout className="Apps" tabs={Apps.tabRoutes}/>
    );
  }
}
