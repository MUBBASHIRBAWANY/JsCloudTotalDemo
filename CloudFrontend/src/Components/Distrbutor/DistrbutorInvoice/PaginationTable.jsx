import React, { useState } from 'react';

const PaginationTable = ({ data, headers, rowsPerPage = 100 }) => {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(data.length / rowsPerPage);

  const currentData = data.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  return (
    <div className="overflow-x-auto rounded-lg border pd-border-default border shadow-md">
      <table className="pd-data-table min-w-full">
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th key={index} className="px-2 py-2 text-xs font-medium uppercase pd-text-muted">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[color:var(--pd-border-card)]">
          {currentData.map((row, rowIndex) => (
            <tr key={rowIndex} >
              {headers.map((header, colIndex) => (
                <td key={colIndex} className="whitespace-nowrap px-2 py-2 text-sm pd-text-body">
                  {row[header]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-center items-center gap-2 mt-4">
        <button
          className="px-3 py-1 pd-bg-readonly rounded"
          disabled={page === 0}
          onClick={() => setPage((p) => p - 1)}
        >
          Prev
        </button>
        <span>
          Page {page + 1} / {totalPages}
        </span>
        <button
          className="px-3 py-1 pd-bg-readonly rounded"
          disabled={page === totalPages - 1}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default PaginationTable;
