import React from 'react';
import { useParams } from 'react-router-dom';
import SlabAdd from '../../../Components/Distrbutor/Slab/SlabAdd';

const SlabEditPage = () => {
  const { id } = useParams();
  return (
    <div>
      <SlabAdd editId={id} />
    </div>
  );
};

export default SlabEditPage;
