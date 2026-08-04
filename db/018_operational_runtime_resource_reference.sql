ALTER TABLE app.operational_dataset_binding
  DROP CONSTRAINT IF EXISTS operational_dataset_binding_resource_reference_check;

ALTER TABLE app.operational_dataset_binding
  ADD CONSTRAINT operational_dataset_binding_resource_reference_check
  CHECK(
    length(resource_reference) BETWEEN 1 AND 300
    AND resource_reference ~ '^[A-Za-z][A-Za-z0-9_.-]*$'
  );
