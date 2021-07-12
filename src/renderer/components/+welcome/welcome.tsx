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

import "./welcome.scss";
import React from "react";
import { observer } from "mobx-react";
import { Icon } from "../icon";
import { productName, slackUrl } from "../../../common/vars";
import { WelcomeMenuRegistry } from "../../../extensions/registries";

@observer
export class Welcome extends React.Component {
  render() {
    return (
      <div className="Welcome flex justify-center align-center">
        <div className="box">
          <Icon svg="logo-lens" className="logo" />

          <h2>Welcome to {productName} 5!</h2>

          <p>
            To get you started we have auto-detected your clusters in your kubeconfig file and added them to the catalog, your centralized view for managing all your cloud-native resources.
            <br/><br/>
            If you have any questions or feedback, please join our <a href={slackUrl} target="_blank" rel="noreferrer" className="link">Lens Community slack channel</a>.
          </p>

          <ul className="box">
            {WelcomeMenuRegistry.getInstance().getItems().map((item, index) => (
              <li key={index} className="flex grid-12" onClick={() => item.click()}>
                <Icon material={item.icon} className="box col-1" /> <a className="box col-10">{typeof item.title === "string" ? item.title : item.title()}</a> <Icon material="navigate_next" className="box col-1" />
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }
}
