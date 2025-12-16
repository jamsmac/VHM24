import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import {
  Pagination,
  SimplePagination,
  PaginationWithSize,
  LoadMore,
  PageJump
} from './Pagination'

const meta: Meta<typeof Pagination> = {
  title: 'UI/Pagination',
  component: Pagination,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => {
    const [page, setPage] = useState(1)
    return (
      <Pagination
        currentPage={page}
        totalPages={10}
        onPageChange={setPage}
      />
    )
  },
}

export const ManyPages: Story = {
  render: () => {
    const [page, setPage] = useState(5)
    return (
      <Pagination
        currentPage={page}
        totalPages={50}
        onPageChange={setPage}
      />
    )
  },
}

export const FirstPage: Story = {
  render: () => {
    const [page, setPage] = useState(1)
    return (
      <Pagination
        currentPage={page}
        totalPages={10}
        onPageChange={setPage}
      />
    )
  },
}

export const LastPage: Story = {
  render: () => {
    const [page, setPage] = useState(10)
    return (
      <Pagination
        currentPage={page}
        totalPages={10}
        onPageChange={setPage}
      />
    )
  },
}

export const Simple: Story = {
  render: () => {
    const [page, setPage] = useState(1)
    return (
      <SimplePagination
        currentPage={page}
        totalPages={10}
        onPageChange={setPage}
      />
    )
  },
}

export const WithPageSize: Story = {
  render: () => {
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    return (
      <PaginationWithSize
        currentPage={page}
        totalPages={10}
        pageSize={pageSize}
        totalItems={100}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    )
  },
}

export const LoadMoreButton: Story = {
  render: () => {
    const [loading, setLoading] = useState(false)
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-3 border rounded">
              Item {i}
            </div>
          ))}
        </div>
        <LoadMore
          hasMore={true}
          isLoading={loading}
          onLoadMore={() => {
            setLoading(true)
            setTimeout(() => setLoading(false), 1000)
          }}
        />
      </div>
    )
  },
}

export const WithPageJump: Story = {
  render: () => {
    const [page, setPage] = useState(1)
    return (
      <div className="flex items-center gap-4">
        <Pagination
          currentPage={page}
          totalPages={100}
          onPageChange={setPage}
        />
        <PageJump
          currentPage={page}
          totalPages={100}
          onPageChange={setPage}
        />
      </div>
    )
  },
}

export const TablePagination: Story = {
  render: () => {
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const totalItems = 156

    return (
      <div className="w-[600px] border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">ID</th>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: pageSize }).map((_, i) => (
              <tr key={i} className="border-t">
                <td className="px-4 py-2">{(page - 1) * pageSize + i + 1}</td>
                <td className="px-4 py-2">Item {(page - 1) * pageSize + i + 1}</td>
                <td className="px-4 py-2">Active</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-4 border-t bg-gray-50">
          <PaginationWithSize
            currentPage={page}
            totalPages={Math.ceil(totalItems / pageSize)}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size)
              setPage(1)
            }}
          />
        </div>
      </div>
    )
  },
}

export const SinglePage: Story = {
  render: () => (
    <Pagination
      currentPage={1}
      totalPages={1}
      onPageChange={() => {}}
    />
  ),
}
