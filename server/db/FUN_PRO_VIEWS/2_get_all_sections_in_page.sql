DELIMITER //
DROP PROCEDURE IF EXISTS get_all_sections_in_page //
CREATE PROCEDURE get_all_sections_in_page(param_page_id INT)
BEGIN
    DECLARE _sections VARCHAR(10000);
    DECLARE _res VARCHAR(10000);

    SET SESSION group_concat_max_len = 10000;  -- Adjust this value as needed.

    SELECT GROUP_CONCAT(ps.id_sections) INTO _sections
    FROM pages p
    INNER JOIN pages_sections ps ON p.id = ps.id_pages
    WHERE p.id = param_page_id;

    SET _res = _sections;	

    WHILE _res IS NOT NULL DO
        SELECT GROUP_CONCAT(child) INTO _res
        FROM sections_hierarchy
        WHERE FIND_IN_SET(parent, _res);

        IF _res IS NOT NULL THEN
            SET _sections = CONCAT(_sections, ',', _res);
        END IF;
    END WHILE;
    
    IF _sections IS NULL THEN
		SET _sections = -1;
	END IF;
	
    SET @sql = CONCAT("SELECT s.id, s.id_styles, s.`name` as section_name, styles.`name` as style_name
			FROM sections s
			INNER JOIN styles ON (s.id_styles = styles.id)
			WHERE s.id IN (",_sections,")");
    PREPARE stmt FROM @sql;
	EXECUTE stmt;
	DEALLOCATE PREPARE stmt;
END;
//
DELIMITER ;
