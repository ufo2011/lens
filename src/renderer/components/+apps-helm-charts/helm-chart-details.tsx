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

import "./helm-chart-details.scss";

import React, { Component } from "react";
import { getChartDetails, HelmChart } from "../../api/endpoints/helm-charts.api";
import { observable, autorun, makeObservable } from "mobx";
import { observer } from "mobx-react";
import { Drawer, DrawerItem } from "../drawer";
import { boundMethod, stopPropagation } from "../../utils";
import { MarkdownViewer } from "../markdown-viewer";
import { Spinner } from "../spinner";
import { Button } from "../button";
import { Select, SelectOption } from "../select";
import { createInstallChartTab } from "../dock/install-chart.store";
import { Badge } from "../badge";

interface Props {
  chart: HelmChart;
  hideDetails(): void;
}

@observer
export class HelmChartDetails extends Component<Props> {
  @observable chartVersions: HelmChart[];
  @observable selectedChart: HelmChart;
  @observable readme: string = null;
  @observable error: string = null;

  private abortController?: AbortController;

  constructor(props: Props) {
    super(props);
    makeObservable(this);
  }

  componentWillUnmount() {
    this.abortController?.abort();
  }

  chartUpdater = autorun(() => {
    this.selectedChart = null;
    const { chart: { name, repo, version } } = this.props;

    getChartDetails(repo, name, { version })
      .then(result => {
        this.readme = result.readme;
        this.chartVersions = result.versions;
        this.selectedChart = result.versions[0];
      })
      .catch(error => {
        this.error = error;
      });
  });

  @boundMethod
  async onVersionChange({ value: version }: SelectOption<string>) {
    this.selectedChart = this.chartVersions.find(chart => chart.version === version);
    this.readme = null;

    try {
      this.abortController?.abort();
      this.abortController = new AbortController();
      const { chart: { name, repo } } = this.props;
      const { readme } = await getChartDetails(repo, name, { version, reqInit: { signal: this.abortController.signal }});

      this.readme = readme;
    } catch (error) {
      this.error = error;
    }
  }

  @boundMethod
  install() {
    createInstallChartTab(this.selectedChart);
    this.props.hideDetails();
  }

  renderIntroduction() {
    const { selectedChart, chartVersions, onVersionChange } = this;
    const placeholder = require("./helm-placeholder.svg");

    return (
      <div className="introduction flex align-flex-start">
        <img
          className="intro-logo"
          src={selectedChart.getIcon() || placeholder}
          onError={(event) => event.currentTarget.src = placeholder}
        />
        <div className="intro-contents box grow">
          <div className="description flex align-center justify-space-between">
            {selectedChart.getDescription()}
            <Button primary label="Install" onClick={this.install} />
          </div>
          <DrawerItem name="Version" className="version" onClick={stopPropagation}>
            <Select
              themeName="outlined"
              menuPortalTarget={null}
              options={chartVersions.map(chart => chart.version)}
              value={selectedChart.getVersion()}
              onChange={onVersionChange}
            />
          </DrawerItem>
          <DrawerItem name="Home">
            <a href={selectedChart.getHome()} target="_blank" rel="noreferrer">{selectedChart.getHome()}</a>
          </DrawerItem>
          <DrawerItem name="Maintainers" className="maintainers">
            {selectedChart.getMaintainers().map(({ name, email, url }) =>
              <a key={name} href={url || `mailto:${email}`} target="_blank" rel="noreferrer">{name}</a>
            )}
          </DrawerItem>
          {selectedChart.getKeywords().length > 0 && (
            <DrawerItem name="Keywords" labelsOnly>
              {selectedChart.getKeywords().map(key => <Badge key={key} label={key} />)}
            </DrawerItem>
          )}
        </div>
      </div>
    );
  }

  renderReadme() {
    if (this.readme === null) {
      return <Spinner center />;
    }

    return (
      <div className="chart-description">
        <MarkdownViewer markdown={this.readme} />
      </div>
    );
  }

  renderContent() {
    if (!this.selectedChart) {
      return <Spinner center />;
    }

    if (this.error) {
      return (
        <div className="box grow">
          <p className="error">{this.error}</p>
        </div>
      );
    }

    return (
      <div className="box grow">
        {this.renderIntroduction()}
        {this.renderReadme()}
      </div>
    );
  }

  render() {
    const { chart, hideDetails } = this.props;
    const title = chart ? <>Chart: {chart.getFullName()}</> : "";

    return (
      <Drawer
        className="HelmChartDetails"
        usePortal={true}
        open={!!chart}
        title={title}
        onClose={hideDetails}
      >
        {this.renderContent()}
      </Drawer>
    );
  }
}
