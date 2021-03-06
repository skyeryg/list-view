import React, { FC, useState, useImperativeHandle, forwardRef, useEffect, useRef } from 'react';

import { PullToRefresh, ListView } from 'antd-mobile';
import { ListViewProps } from 'antd-mobile/es/list-view';
import { useLoadMore } from '@umijs/hooks';

const ONE_REM = parseInt(document.documentElement.style.fontSize, 10) || 100;
const SCALE = ONE_REM / 100;
/**
 * 像素转换
 * @param {Number} px - 750视觉稿像素
 * @return {Number} 屏幕上实际像素
 */
export function px2hd(px: number) {
  return Number((px * SCALE).toFixed(1));
}

interface Result {
  total: number;
  data: any[];
}

interface AliasProps {
  data?: string;
  pageSize?: string;
  offset?: string;
  total?: string;
  page?: string;
}

export interface LoadMoreListAttributes {
  reloadDataSource: () => void;
}

export interface LoadMoreListViewProps
  extends Omit<ListViewProps, 'renderFooter' | 'onEndReached' | 'dataSource'>,
    Omit<React.ForwardRefExoticComponent<React.RefAttributes<any>>, '$$typeof'> {
  ref?: any;
  height?: string;
  isTabsPage?: boolean;
  alias?: AliasProps;
  container?: any;
  requestFunc: (params: any) => Promise<any>;
  requestParams?: object;
  renderRow: (
    rowData: any,
    sectionID: string | number,
    rowID: string | number,
    highlightRow?: boolean,
  ) => React.ReactElement<any>;
  renderFooter?: (
    noMore: boolean,
    loadingMore: boolean,
    loadMore?: () => void,
  ) => React.ReactElement<any>;
  noData?: React.ReactNode | string;
  onChange?: (data: any) => void;
}

const defaultAlias = {
  data: 'data',
  pageSize: 'pageSize',
  offset: 'offset',
  total: 'total',
  page: 'page',
};
const LoadMoreListView: FC<LoadMoreListViewProps> = forwardRef(
  (
    {
      height,
      requestFunc,
      requestParams = {},
      alias = {},
      renderFooter,
      container = '',
      noData,
      isTabsPage = false,
      onChange = () => {},
      ...otherProps
    },
    ref,
  ) => {
    // const [preRequestParams, setPreRequestParams] = useState(requestParams);
    const trueAlias = { ...defaultAlias, ...alias };

    const asyncFn = (abc): Promise<Result> =>
      new Promise(resolve => {
        const { pageSize, offset, page } = abc;
        const reqParams = requestParams as any;
        if (reqParams.pageSize || alias.pageSize) {
          reqParams[trueAlias.pageSize] = pageSize;
        }
        if (reqParams.offset || alias.offset) {
          reqParams[trueAlias.offset] = offset;
        }
        if (reqParams.page || alias.page) {
          reqParams[trueAlias.page] = page;
        }

        requestFunc(reqParams).then(res => {
          resolve({
            total: res[trueAlias.total],
            data: res[trueAlias.data],
          });
        });
      });
    const containerRef = useRef<HTMLDivElement>(null);
    const [viewHeight, setViewHeight] = useState(document.documentElement.clientHeight);
    const [isInit, setIsInit] = useState(false);
    const [dataSet] = useState(
      new ListView.DataSource({
        rowHasChanged: (row1, row2) => row1 !== row2,
      }),
    );

    useEffect(() => {
      const offsetTop = containerRef.current.getBoundingClientRect().top;
      setViewHeight(viewHeight - offsetTop - px2hd(isTabsPage ? 100 : 0));
      setIsInit(true);
    }, []);

    const { data, loading, loadingMore, reload, loadMore, noMore } = useLoadMore<Result, any>(
      asyncFn,
      [container],
      {
        ref: containerRef,
        initPageSize: requestParams[trueAlias.pageSize],
        incrementSize: 10,
      },
    );
    useImperativeHandle(ref, () => ({
      reloadDataSource: reload,
    }));
    const touchLoadMore = () => {
      if (!noMore) loadMore();
    };
    useEffect(() => {
      onChange(data);
    }, [data]);

    return (
      <div>
        {data.length === 0 && !loading && noData && (
          <div
            onClick={() => {
              reload();
            }}
          >
            {noData}
          </div>
        )}
        <div
          style={{ display: data.length || loading || !noData ? 'block' : 'none' }}
          ref={containerRef}
        >
          {isInit && (
            <ListView
              dataSource={dataSet.cloneWithRows(data)}
              renderFooter={() => {
                if (renderFooter) {
                  return renderFooter(noMore, loadingMore, loadMore);
                }
                if (noMore) {
                  return (
                    <div style={{ padding: 30, textAlign: 'center' }} onClick={touchLoadMore}>
                      已全部加载
                    </div>
                  );
                }
                return (
                  <div
                    style={{
                      display: !loading ? 'block' : 'none',
                      padding: 30,
                      textAlign: 'center',
                    }}
                    onClick={touchLoadMore}
                  >
                    {loadingMore ? '加载中...' : '加载完成'}
                  </div>
                );
              }}
              style={{
                height: height || viewHeight,
                overflow: 'auto',
              }}
              pageSize={10}
              onEndReached={loadMore}
              pullToRefresh={
                <PullToRefresh
                  refreshing={loading}
                  onRefresh={reload}
                  damping={300}
                  distanceToRefresh={50}
                />
              }
              onEndReachedThreshold={100}
              {...otherProps}
            />
          )}
        </div>
      </div>
    );
  },
);

export default LoadMoreListView;
